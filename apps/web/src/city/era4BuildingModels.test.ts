import { civicCatalogueForEra } from "@cr/economy";
import { getEraNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  MODEL_STAGES,
  nodeFilePrefix,
  nodeModelUrls,
  resolveBuildingModel,
} from "./buildingAssets";
import {
  civicFootprint,
  civicModelBasename,
  civicTypeModelUrls,
  resolveCivicModel,
} from "./civicBuildings";
import {
  hasAuthoredEraTownHall,
  resolveEraTownHall,
  TOWN_HALL_ERA_MODELS,
  TOWN_HALL_FOOTPRINT,
} from "./townHall";
import { footprintFor } from "./worldLayout";

const SOURCE_FILES = import.meta.glob(
  "./art/building-sources/era-04-classical-all-buildings.dc.html",
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

const EXPORTER_SOURCES = import.meta.glob(
  "../../../../scripts/export-era4-building-models.mjs",
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

async function era4KitSource(html: string): Promise<string> {
  const manifest = JSON.parse(scriptBlock(html, "__bundler/manifest")) as Record<
    string,
    { readonly mime: string; readonly compressed?: boolean; readonly data: string }
  >;
  const matches: string[] = [];

  for (const entry of Object.values(manifest)) {
    if (!/javascript/.test(entry.mime)) {
      continue;
    }
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
    if (source.includes("window.Era4Kit")) {
      matches.push(source);
    }
  }

  expect(matches, "one embedded Era4Kit resource").toHaveLength(1);
  return matches[0] as string;
}

interface SourceRosterRow {
  readonly art: string;
  readonly sourceStable: string;
  readonly sourceName: string;
  readonly sourceTarget: string;
  readonly sourceFootprint: string;
  readonly ordinal: number;
}

function sourceRosterOf(source: string): SourceRosterRow[] {
  const body = source.match(/roster\(\)\s*\{\s*return\s*\[([\s\S]*?)\];\s*\}/)?.[1];
  expect(body, "Era4Kit roster() body").toBeTruthy();
  const rows = [
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
  expect(rows, "complete Era4Kit roster tuples").toHaveLength(10);
  return rows;
}

function identityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/^civic\s+/, "")
    .trim();
}

function runtimeMappingFrom(sourceRows: readonly SourceRosterRow[]): ReadonlyArray<{
  readonly kind: "skill" | "civic" | "townhall";
  readonly id: string;
  readonly art: string;
  readonly sourceFootprint: string;
  readonly runtimeFootprint: string;
  readonly shippingStages: readonly string[];
  readonly outputs: readonly string[];
}> {
  const catalogue = civicCatalogueForEra("classical");
  expect(catalogue).toHaveLength(4);
  const usedCivics = new Set<string>();

  const mapping = sourceRows.map((source) => {
    let kind: "skill" | "civic" | "townhall";
    let id: string;
    if (source.sourceTarget.startsWith("POL.")) {
      kind = "skill";
      id = source.sourceTarget;
    } else if (source.sourceTarget === "civic") {
      kind = "civic";
      const matches = catalogue.filter(
        (row) => identityName(row.name) === identityName(source.sourceName),
      );
      expect(matches, `${source.art} maps to one current civic row`).toHaveLength(1);
      id = matches[0]?.id as string;
      expect(usedCivics.has(id), `${id} is claimed by two source rows`).toBe(false);
      usedCivics.add(id);
    } else {
      expect(source.sourceTarget, `${source.art} source target`).toBe("hub");
      kind = "townhall";
      id = "classical";
    }

    const footprint =
      kind === "skill"
        ? footprintFor(id)
        : kind === "civic"
          ? civicFootprint(id)
          : TOWN_HALL_FOOTPRINT;
    expect(footprint, `${kind}:${id} runtime footprint`).not.toBeNull();
    const shippingStages = kind === "skill" ? [...MODEL_STAGES] : ["built"];
    const outputs =
      kind === "skill"
        ? MODEL_STAGES.map((stage) => `${nodeFilePrefix(id)}-${stage}.glb`)
        : kind === "civic"
          ? [civicModelBasename(id, "built")]
          : ["townhall-classical-built.glb"];

    return {
      kind,
      id,
      art: source.art,
      sourceFootprint: source.sourceFootprint,
      runtimeFootprint: `${footprint?.w}×${footprint?.d}`,
      shippingStages,
      outputs,
    };
  });

  expect(usedCivics.size).toBe(4);
  expect(mapping.filter((entry) => entry.kind === "skill")).toHaveLength(5);
  expect(mapping.filter((entry) => entry.kind === "civic")).toHaveLength(4);
  expect(mapping.filter((entry) => entry.kind === "townhall")).toHaveLength(1);
  return mapping;
}

function basename(url: string): string {
  return (url.split("?")[0] ?? url).split("/").pop() as string;
}

describe("era four attachment → current runtime targets", () => {
  it("binds every complete source roster tuple to its exact runtime target and output policy", async () => {
    const source = await era4KitSource(
      onlyRaw(SOURCE_FILES, "the canonical Era 4 source is preserved"),
    );
    const sourceRoster = sourceRosterOf(source);
    expect(sourceRoster).toEqual([
      {
        art: "senate",
        sourceStable: "Civic Center",
        sourceName: "the Senate House",
        sourceTarget: "hub",
        sourceFootprint: "3×3",
        ordinal: 1,
      },
      {
        art: "baths",
        sourceStable: "Bathhouse",
        sourceName: "the Civic Baths",
        sourceTarget: "civic",
        sourceFootprint: "3×2",
        ordinal: 2,
      },
      {
        art: "cottages",
        sourceStable: "Housing",
        sourceName: "the Cottages",
        sourceTarget: "civic",
        sourceFootprint: "2×1",
        ordinal: 3,
      },
      {
        art: "fountain",
        sourceStable: "Water",
        sourceName: "the Fountain",
        sourceTarget: "civic",
        sourceFootprint: "1×1",
        ordinal: 4,
      },
      {
        art: "dock",
        sourceStable: "Dock",
        sourceName: "the Grain Dock",
        sourceTarget: "civic",
        sourceFootprint: "3×2",
        ordinal: 5,
      },
      {
        art: "stonecutter",
        sourceStable: "Workshop",
        sourceName: "the Stonecutter’s Shop",
        sourceTarget: "POL.1",
        sourceFootprint: "2×2",
        ordinal: 6,
      },
      {
        art: "barracks",
        sourceStable: "Barracks",
        sourceName: "the Barracks",
        sourceTarget: "POL.2",
        sourceFootprint: "3×2",
        ordinal: 7,
      },
      {
        art: "customs",
        sourceStable: "Customs",
        sourceName: "the Customs House",
        sourceTarget: "POL.3",
        sourceFootprint: "3×2",
        ordinal: 8,
      },
      {
        art: "cellars",
        sourceStable: "Store",
        sourceName: "the Wine Cellars",
        sourceTarget: "POL.4",
        sourceFootprint: "2×2",
        ordinal: 9,
      },
      {
        art: "surveyor",
        sourceStable: "Survey",
        sourceName: "the Surveyor’s Shop",
        sourceTarget: "POL.8",
        sourceFootprint: "1×1",
        ordinal: 10,
      },
    ]);

    const defsBody = source.match(
      /defs\(\)\s*\{[\s\S]*?return\s*\{([\s\S]*?)\};\s*\}/,
    )?.[1];
    expect(defsBody, "Era4Kit defs() body").toBeTruthy();
    const sourceKeys = [...(defsBody ?? "").matchAll(/^\s*([a-z]+):\s*\(p\)/gm)].map(
      (match) => match[1],
    );
    expect(sourceKeys).toHaveLength(10);
    expect([...sourceKeys].sort()).toEqual(sourceRoster.map((entry) => entry.art).sort());

    const mapping = runtimeMappingFrom(sourceRoster);
    expect(
      mapping.map(
        ({
          art,
          kind,
          id,
          sourceFootprint,
          runtimeFootprint,
          shippingStages,
          outputs,
        }) => ({
          art,
          target: `${kind}:${id}`,
          sourceFootprint,
          runtimeFootprint,
          shippingStages,
          outputs,
        }),
      ),
    ).toEqual([
      {
        art: "senate",
        target: "townhall:classical",
        sourceFootprint: "3×3",
        runtimeFootprint: "3×2",
        shippingStages: ["built"],
        outputs: ["townhall-classical-built.glb"],
      },
      {
        art: "baths",
        target: "civic:classical_baths",
        sourceFootprint: "3×2",
        runtimeFootprint: "3×2",
        shippingStages: ["built"],
        outputs: ["civic-classical-baths-built.glb"],
      },
      {
        art: "cottages",
        target: "civic:classical_apartment_block",
        sourceFootprint: "2×1",
        runtimeFootprint: "1×2",
        shippingStages: ["built"],
        outputs: ["civic-classical-apartment-block-built.glb"],
      },
      {
        art: "fountain",
        target: "civic:classical_fountain",
        sourceFootprint: "1×1",
        runtimeFootprint: "1×1",
        shippingStages: ["built"],
        outputs: ["civic-classical-fountain-built.glb"],
      },
      {
        art: "dock",
        target: "civic:classical_public_granary",
        sourceFootprint: "3×2",
        runtimeFootprint: "2×2",
        shippingStages: ["built"],
        outputs: ["civic-classical-public-granary-built.glb"],
      },
      ...(
        [
          ["stonecutter", "POL.1", "2×2", "2×2"],
          ["barracks", "POL.2", "3×2", "2×1"],
          ["customs", "POL.3", "3×2", "2×2"],
          ["cellars", "POL.4", "2×2", "2×1"],
          ["surveyor", "POL.8", "1×1", "2×2"],
        ] as const
      ).map(([art, id, sourceFootprint, runtimeFootprint]) => ({
        art,
        target: `skill:${id}`,
        sourceFootprint,
        runtimeFootprint,
        shippingStages: [...MODEL_STAGES],
        outputs: MODEL_STAGES.map((stage) => `${nodeFilePrefix(id)}-${stage}.glb`),
      })),
    ]);

    const exporter = onlyRaw(EXPORTER_SOURCES, "the deterministic Era 4 exporter exists");
    const declared = [
      ...exporter.matchAll(
        /\{\s*kind: "(skill|civic|townhall)",\s*id: "([^"]+)",\s*art: "([^"]+)"/g,
      ),
    ].map((match) => ({ kind: match[1], id: match[2], art: match[3] }));
    expect(declared).toHaveLength(10);
    expect(declared).toEqual(mapping.map(({ kind, id, art }) => ({ kind, id, art })));
    expect(
      [...exporter.matchAll(/fitQuarterTurns:\s*(\d+)/g)].map((match) => match[1]),
    ).toEqual(["1"]);
  });

  it("derives exactly five Classical skill targets and resolves all three authored stages", () => {
    const expected = [...getEraNodes("classical")];
    expect(expected).toHaveLength(5);
    expect(expected).toEqual(["POL.1", "POL.2", "POL.3", "POL.4", "POL.8"]);

    for (const nodeId of expected) {
      expect(footprintFor(nodeId).w * footprintFor(nodeId).d).toBeGreaterThan(0);
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

  it("derives exactly four Classical civic targets and bundles built only", () => {
    const rows = civicCatalogueForEra("classical");
    const expected = rows.map((row) => row.id);
    expect(rows).toHaveLength(4);
    expect(expected).toEqual([
      "classical_public_granary",
      "classical_apartment_block",
      "classical_baths",
      "classical_fountain",
    ]);

    for (const id of expected) {
      const footprint = civicFootprint(id);
      expect(
        (footprint?.w ?? 0) * (footprint?.d ?? 0),
        `${id} frozen footprint`,
      ).toBeGreaterThan(0);
      const built = resolveCivicModel(id, "built");
      expect(built?.kind, `${id}/built`).toBe("glb");
      expect(built?.url, `${id}/built url`).not.toBeNull();
      expect(civicTypeModelUrls(id).map(basename)).toEqual([
        civicModelBasename(id, "built"),
      ]);

      for (const stage of ["site", "construction"] as const) {
        const early = resolveCivicModel(id, stage);
        expect(early?.kind, `${id}/${stage} visible fallback`).toBe(stage);
        expect(early?.url, `${id}/${stage} deliberately unbundled`).toBeNull();
      }
    }
  });

  it("resolves the Senate House as Classical authored hub art on the frozen hall plot", () => {
    expect(TOWN_HALL_FOOTPRINT).toEqual({ w: 3, d: 2 });
    expect(TOWN_HALL_ERA_MODELS.classical).toBe("townhall-classical-built.glb");
    expect(hasAuthoredEraTownHall("classical")).toBe(true);

    const resolved = resolveEraTownHall("classical", "prehistoric");
    expect(resolved.art).toBe("authored");
    expect(resolved.showing_era).toBe("classical");
    expect(resolved.model?.kind).toBe("glb");
    expect(basename(resolved.model?.url ?? "")).toBe("townhall-classical-built.glb");
  });

  it("shows each model through the runtime contain-fit with its frozen plot around it", () => {
    const preview = onlyRaw(PREVIEW_SOURCES, "the official model preview exists");
    expect(preview).toContain("prepareModel(gltf.scene, footprint)");
    expect(preview).toContain("PlotFitContext");
    expect(preview).toContain("footprintFor(nodeId)");
    expect(preview).toContain("civicFootprint(typeId)");
    expect(preview).toContain("TOWN_HALL_FOOTPRINT");
  });
});
