import { createHash } from "node:crypto";

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
import {
  hasAuthoredEraTownHall,
  resolveEraTownHall,
  TOWN_HALL_ERA_MODELS,
  TOWN_HALL_FOOTPRINT,
  townHallPreloadUrls,
} from "./townHall";
import { useTownHallPreload } from "./three/townHallPreload";
import { footprintFor } from "./worldLayout";

const SOURCE_FILES = import.meta.glob(
  "./art/building-sources/era-05-medieval-all-buildings.dc.html",
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

const EXPORTER_SOURCES = import.meta.glob(
  "../../../../scripts/export-era5-building-models.mjs",
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

const SOURCE_SHA256 = "493fbec1c5677cb7952cfab9e872897d505334d105ed65c01c86d3717596335a";

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
    art: "townhall",
    sourceStable: "Town Hall",
    sourceName: "the Town Hall",
    sourceTarget: "hub",
    sourceFootprint: "3×3",
    ordinal: 1,
  },
  {
    art: "chapel",
    sourceStable: "Chapel",
    sourceName: "the Chapel",
    sourceTarget: "civic",
    sourceFootprint: "2×2",
    ordinal: 2,
  },
  {
    art: "barn",
    sourceStable: "Barn",
    sourceName: "the Great Barn",
    sourceTarget: "civic",
    sourceFootprint: "3×2",
    ordinal: 3,
  },
  {
    art: "castle",
    sourceStable: "Castle",
    sourceName: "the Castle",
    sourceTarget: "civic",
    sourceFootprint: "3×3",
    ordinal: 4,
  },
  {
    art: "houses",
    sourceStable: "Housing",
    sourceName: "the Timber Houses",
    sourceTarget: "civic",
    sourceFootprint: "2×1",
    ordinal: 5,
  },
  {
    art: "fair",
    sourceStable: "Fair",
    sourceName: "the Fairground",
    sourceTarget: "civic",
    sourceFootprint: "2×2",
    ordinal: 6,
  },
  {
    art: "weaver",
    sourceStable: "Workshop",
    sourceName: "the Weaver’s Shop",
    sourceTarget: "CLO.1",
    sourceFootprint: "2×2",
    ordinal: 7,
  },
  {
    art: "woolstore",
    sourceStable: "Store",
    sourceName: "the Wool Store",
    sourceTarget: "CLO.2",
    sourceFootprint: "3×2",
    ordinal: 8,
  },
  {
    art: "guildhall",
    sourceStable: "Guild",
    sourceName: "the Guild Hall",
    sourceTarget: "CLO.3",
    sourceFootprint: "3×2",
    ordinal: 9,
  },
  {
    art: "tower",
    sourceStable: "Tower",
    sourceName: "the Tower House",
    sourceTarget: "CLO.4",
    sourceFootprint: "1×1",
    ordinal: 10,
  },
];

const MAPPING: readonly MappingRow[] = [
  {
    art: "townhall",
    kind: "townhall",
    id: "medieval",
    sourceFootprint: "3×3",
    runtimeFootprint: "3×2",
    shippingStages: ["built"],
    outputs: ["townhall-medieval-built.glb"],
  },
  {
    art: "chapel",
    kind: "civic",
    id: "medieval_chapel",
    sourceFootprint: "2×2",
    runtimeFootprint: "1×1",
    shippingStages: ["built"],
    outputs: ["civic-medieval-chapel-built.glb"],
  },
  {
    art: "barn",
    kind: "civic",
    id: "medieval_great_barn",
    sourceFootprint: "3×2",
    runtimeFootprint: "2×2",
    shippingStages: ["built"],
    outputs: ["civic-medieval-great-barn-built.glb"],
  },
  {
    art: "castle",
    kind: "civic",
    id: "medieval_cottages",
    sourceFootprint: "3×3",
    runtimeFootprint: "2×1",
    shippingStages: ["built"],
    outputs: ["civic-medieval-cottages-built.glb"],
  },
  {
    art: "houses",
    kind: "skill",
    id: "RAT.6",
    sourceFootprint: "2×1",
    runtimeFootprint: "2×1",
    shippingStages: [...MODEL_STAGES],
    outputs: MODEL_STAGES.map((stage) => `rat-6-${stage}.glb`),
  },
  {
    art: "fair",
    kind: "civic",
    id: "medieval_market_square",
    sourceFootprint: "2×2",
    runtimeFootprint: "2×2",
    shippingStages: ["built"],
    outputs: ["civic-medieval-market-square-built.glb"],
  },
  ...(
    [
      ["weaver", "RAT.1", "2×2", "2×2"],
      ["woolstore", "RAT.2", "3×2", "2×1"],
      ["guildhall", "RAT.3", "3×2", "2×2"],
      ["tower", "RAT.4", "1×1", "2×2"],
    ] as const
  ).map(([art, id, sourceFootprint, runtimeFootprint]) => ({
    art,
    kind: "skill" as const,
    id,
    sourceFootprint,
    runtimeFootprint,
    shippingStages: [...MODEL_STAGES],
    outputs: MODEL_STAGES.map((stage) => `${nodeFilePrefix(id)}-${stage}.glb`),
  })),
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

async function era5KitSource(html: string): Promise<string> {
  const manifest = JSON.parse(scriptBlock(html, "__bundler/manifest")) as Record<
    string,
    { readonly mime: string; readonly compressed?: boolean; readonly data: string }
  >;
  const matches: string[] = [];
  for (const entry of Object.values(manifest)) {
    if (!/javascript/.test(entry.mime)) continue;
    const stored = Uint8Array.from(atob(entry.data), (character) =>
      character.charCodeAt(0),
    );
    let bytes = stored;
    if (entry.compressed) {
      const stream = new DecompressionStream("gzip");
      const writer = stream.writable.getWriter();
      const decoded = new Response(stream.readable).arrayBuffer();
      await writer.write(stored);
      await writer.close();
      bytes = new Uint8Array(await decoded);
    }
    const source = new TextDecoder().decode(bytes);
    if (source.includes("window.Era5Kit")) matches.push(source);
  }
  expect(matches, "one embedded Era5Kit resource").toHaveLength(1);
  return matches[0] as string;
}

function sourceRosterOf(source: string): SourceRosterRow[] {
  const body = source.match(/roster\(\)\s*\{\s*return\s*\[([\s\S]*?)\];\s*\}/)?.[1];
  expect(body, "Era5Kit roster() body").toBeTruthy();
  return [
    ...(body ?? "").matchAll(
      /\[\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*(\d+)\s*\]/g,
    ),
  ].map((match) => ({
    art: match[1] as string,
    sourceStable: match[2] as string,
    sourceName: match[3] as string,
    sourceTarget: match[4] as string,
    sourceFootprint: match[5] as string,
    ordinal: Number(match[6]),
  }));
}

function basename(url: string): string {
  return (url.split("?")[0] ?? url).split("/").pop() as string;
}

describe("Era 5 canonical attachment and bidirectional ten-building census", () => {
  it("preserves the exact standalone and binds every source tuple to one current runtime target", async () => {
    const html = onlyRaw(SOURCE_FILES, "the canonical Era 5 standalone is preserved");
    expect(new TextEncoder().encode(html)).toHaveLength(1_659_071);
    expect(createHash("sha256").update(html).digest("hex")).toBe(SOURCE_SHA256);

    const source = await era5KitSource(html);
    const sourceRoster = sourceRosterOf(source);
    expect(sourceRoster).toEqual(SOURCE_ROSTER);

    const defsBody = source.match(
      /defs\(\)\s*\{[\s\S]*?return\s*\{([\s\S]*?)\};\s*\}/,
    )?.[1];
    expect(defsBody, "Era5Kit defs() body").toBeTruthy();
    const sourceKeys = [...(defsBody ?? "").matchAll(/^\s*([a-z]+):\s*\(p\)/gm)].map(
      (match) => match[1] as string,
    );
    expect(sourceKeys).toHaveLength(10);
    expect([...sourceKeys].sort()).toEqual(SOURCE_ROSTER.map((row) => row.art).sort());
    expect([...new Set(MAPPING.map((row) => row.art))].sort()).toEqual(
      [...sourceKeys].sort(),
    );

    const runtimeTargets = [
      ...getEraNodes("medieval").map((id) => `skill:${id}`),
      ...civicCatalogueForEra("medieval").map((row) => `civic:${row.id}`),
      "townhall:medieval",
    ];
    expect(runtimeTargets).toHaveLength(10);
    expect(new Set(runtimeTargets).size).toBe(10);
    expect(MAPPING.map((row) => `${row.kind}:${row.id}`).sort()).toEqual(
      [...runtimeTargets].sort(),
    );
    expect(MAPPING.filter((row) => row.kind === "skill")).toHaveLength(5);
    expect(MAPPING.filter((row) => row.kind === "civic")).toHaveLength(4);
    expect(MAPPING.filter((row) => row.kind === "townhall")).toHaveLength(1);

    for (const row of MAPPING) {
      const footprint =
        row.kind === "skill"
          ? footprintFor(row.id)
          : row.kind === "civic"
            ? civicFootprint(row.id)
            : TOWN_HALL_FOOTPRINT;
      expect(`${footprint?.w}×${footprint?.d}`, `${row.kind}:${row.id}`).toBe(
        row.runtimeFootprint,
      );
    }

    const exporter = onlyRaw(EXPORTER_SOURCES, "the deterministic Era 5 exporter exists");
    const declared = [
      ...exporter.matchAll(
        /\{\s*kind: "(skill|civic|townhall)",\s*id: "([^"]+)",\s*art: "([^"]+)"/g,
      ),
    ].map((match) => ({ kind: match[1], id: match[2], art: match[3] }));
    expect(declared).toHaveLength(10);
    expect(declared).toEqual(MAPPING.map(({ kind, id, art }) => ({ kind, id, art })));
  });
});

describe("Era 5 runtime wiring", () => {
  it("resolves all five Medieval skill buildings at all three authored stages", () => {
    const nodes = getEraNodes("medieval");
    expect(nodes).toEqual(["RAT.1", "RAT.2", "RAT.3", "RAT.4", "RAT.6"]);
    for (const nodeId of nodes) {
      expect(nodeModelUrls(nodeId).map(basename), `${nodeId} stage census`).toEqual(
        MODEL_STAGES.map((stage) => `${nodeFilePrefix(nodeId)}-${stage}.glb`),
      );
      for (const stage of MODEL_STAGES) {
        const resolved = resolveBuildingModel(nodeId, stage);
        expect(resolved.kind, `${nodeId}/${stage} is authored`).toBe("glb");
        expect(resolved.url, `${nodeId}/${stage} url`).not.toBeNull();
      }
    }
  });

  it("exposes exactly the four current Medieval civic rows with built models only", () => {
    const rows = civicCatalogueForEra("medieval");
    expect(rows.map((row) => row.id)).toEqual([
      "medieval_great_barn",
      "medieval_cottages",
      "medieval_market_square",
      "medieval_chapel",
    ]);
    const options = civicOptionsForEra("medieval");
    expect(options).toHaveLength(4);
    expect(options.map((option) => option.row.id)).toEqual(rows.map((row) => row.id));
    for (const row of rows) {
      expect(resolveCivicModel(row.id, "built")?.kind, `${row.id}/built`).toBe("glb");
      expect(civicTypeModelUrls(row.id).map(basename)).toEqual([
        civicModelBasename(row.id, "built"),
      ]);
      for (const stage of ["site", "construction"] as const) {
        expect(resolveCivicModel(row.id, stage)).toMatchObject({
          kind: stage,
          url: null,
        });
      }
    }
  });

  it("resolves the Medieval Court House as authored era-scoped Town Hall art", () => {
    expect(TOWN_HALL_ERA_MODELS.medieval).toBe("townhall-medieval-built.glb");
    expect(hasAuthoredEraTownHall("medieval")).toBe(true);
    const resolved = resolveEraTownHall("medieval", "prehistoric");
    expect(resolved.art).toBe("authored");
    expect(resolved.showing_era).toBe("medieval");
    expect(basename(resolved.model?.url ?? "")).toBe("townhall-medieval-built.glb");
  });

  it("publishes the ratified stable names and Medieval subtitles", () => {
    const expected = [
      ["RAT.1", "Workshop", "the Weaver's Shop"],
      ["RAT.2", "Store", "the Wool Store"],
      ["RAT.3", "Assembly Hall", "the Guild Hall"],
      ["RAT.4", "Tower", "the Tower House"],
      ["RAT.6", "Dwellings", "the Timber Houses"],
    ] as const;
    for (const [nodeId, stable, subtitle] of expected) {
      expect(buildingName(nodeId), nodeId).toBe(stable);
      expect(buildingSubtitle(nodeId, "medieval"), nodeId).toBe(subtitle);
      expect(buildingDisplayName(nodeId, "medieval"), nodeId).toBe(
        `${stable}, ${subtitle}`,
      );
    }
    expect(buildingSubtitle("town-hall", "medieval")).toBe("the Court House");
    expect(buildingDisplayName("town-hall", "medieval")).toBe("Town Hall, the Court House");
  });

  it("offers Medieval skills, civics and Court House on the official preview", () => {
    const preview = onlyRaw(PREVIEW_SOURCES, "the official model preview exists");
    expect(preview).toContain('getEraNodes("medieval")');
    expect(preview).toContain("ERA_FIVE_CIVIC_TYPE_IDS");
    expect(preview).toContain("Era five skill buildings (earned)");
    expect(preview).toContain("Era five civic buildings (bought)");
    expect(preview).toContain("Court House");
  });

  it("preloads the Medieval hall once in Era 5 and never from another era", () => {
    const medieval = resolveEraTownHall("medieval", "prehistoric").model?.url ?? null;
    expect(medieval).toMatch(/townhall-medieval-built\.glb/);
    expect(townHallPreloadUrls(medieval)).toEqual([medieval]);

    for (const eraId of ["prehistoric", "neolithic", "bronze_age", "classical"] as const) {
      const other = resolveEraTownHall(eraId, "prehistoric").model?.url ?? null;
      expect(townHallPreloadUrls(other), eraId).not.toContain(medieval);
    }

    const preload = vi.fn();
    const hook = renderHook(
      ({ url }: { url: string | null }) => useTownHallPreload(url, preload),
      { initialProps: { url: medieval } },
    );
    hook.rerender({ url: `${medieval}` });
    hook.rerender({ url: medieval });
    expect(preload.mock.calls.map(([url]) => url)).toEqual([medieval]);
  });
});
