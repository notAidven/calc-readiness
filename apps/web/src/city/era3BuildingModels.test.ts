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
  civicModelBasename,
  civicTypeModelUrls,
  resolveCivicModel,
} from "./civicBuildings";
import {
  hasAuthoredEraTownHall,
  resolveEraTownHall,
  TOWN_HALL_ERA_MODELS,
} from "./townHall";

const ERA_THREE_MAPPING = [
  { kind: "skill", id: "LIN.1", art: "hall" },
  { kind: "skill", id: "LIN.3", art: "foundry" },
  { kind: "skill", id: "LIN.4", art: "treasury" },
  { kind: "skill", id: "LIN.5", art: "yard" },
  { kind: "skill", id: "LIN.6", art: "stronghold" },
  { kind: "civic", id: "bronze_age_terraced_fields", art: "fields" },
  { kind: "civic", id: "bronze_age_walled_houses", art: "houses" },
  { kind: "civic", id: "bronze_age_bathhouse", art: "steam" },
  { kind: "civic", id: "bronze_age_weigh_house", art: "post" },
  { kind: "townhall", id: "bronze_age", art: "council" },
] as const;

const EXPORTER_SOURCES = import.meta.glob(
  "../../../../scripts/export-era3-building-models.mjs",
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

function basename(url: string): string {
  return (url.split("?")[0] ?? url).split("/").pop() as string;
}

describe("era three attachment → live model registries", () => {
  it("records the attachment-to-roster mapping in the reproducible exporter", () => {
    const paths = Object.keys(EXPORTER_SOURCES);
    expect(paths).toHaveLength(1);
    const source = EXPORTER_SOURCES[paths[0] as string] as string;
    const declared = [
      ...source.matchAll(
        /\{\s*kind: "(skill|civic|townhall)",\s*id: "([^"]+)",\s*art: "([^"]+)"/g,
      ),
    ].map((match) => ({ kind: match[1], id: match[2], art: match[3] }));

    expect(declared).toEqual(ERA_THREE_MAPPING);
  });

  it("quarter-turns the source-wide Terraced Fields into its current long plot", () => {
    const paths = Object.keys(EXPORTER_SOURCES);
    expect(paths).toHaveLength(1);
    const source = EXPORTER_SOURCES[paths[0] as string] as string;
    const quarterTurns = [...source.matchAll(/fitQuarterTurns:\s*(\d+)/g)].map((match) =>
      Number(match[1]),
    );

    // The attachment declares `fields` as 3×2 while the catalogue's frozen plot is 1×2.
    // Exactly this asset turns before export, so contain-fit puts its longer native axis
    // along the plot's longer axis without stretching, clipping or changing gameplay land.
    expect(source).toMatch(
      /id: "bronze_age_terraced_fields",[\s\S]*?art: "fields",[\s\S]*?fitQuarterTurns: 1/,
    );
    expect(quarterTurns).toEqual([1]);
  });

  it("resolves all five Bronze Age skills to their own three GLB stages", () => {
    const nodes = getEraNodes("bronze_age");
    const expectedNodes = ERA_THREE_MAPPING.filter((entry) => entry.kind === "skill").map(
      (entry) => entry.id,
    );
    expect(nodes).toEqual(expectedNodes);

    for (const nodeId of nodes) {
      const urls = nodeModelUrls(nodeId);
      expect(urls, `${nodeId} bundled stages`).toHaveLength(MODEL_STAGES.length);
      expect(urls.map(basename)).toEqual(
        MODEL_STAGES.map((stage) => `${nodeFilePrefix(nodeId)}-${stage}.glb`),
      );
      for (const stage of MODEL_STAGES) {
        const resolved = resolveBuildingModel(nodeId, stage);
        expect(resolved.kind, `${nodeId}/${stage}`).toBe("glb");
        expect(resolved.url, `${nodeId}/${stage} url`).not.toBeNull();
      }
    }
  });

  it("resolves all four Bronze Age civic rows to built GLBs and visible early fallbacks", () => {
    const ids = civicCatalogueForEra("bronze_age").map((row) => row.id);
    const expectedIds = ERA_THREE_MAPPING.filter((entry) => entry.kind === "civic").map(
      (entry) => entry.id,
    );
    expect(ids).toEqual(expectedIds);

    for (const id of ids) {
      const built = resolveCivicModel(id, "built");
      expect(built?.kind, `${id}/built`).toBe("glb");
      expect(built?.url, `${id}/built url`).not.toBeNull();
      expect(civicTypeModelUrls(id).map(basename)).toEqual([
        civicModelBasename(id, "built"),
      ]);

      for (const stage of ["site", "construction"] as const) {
        const early = resolveCivicModel(id, stage);
        expect(early?.kind, `${id}/${stage}`).toBe(stage);
        expect(early?.url, `${id}/${stage} has no committed payload`).toBeNull();
      }
    }
  });

  it("renders the Council Hall as Bronze Age authored hub art, not era-one fallback", () => {
    expect(TOWN_HALL_ERA_MODELS.bronze_age).toBe("townhall-bronze-age-built.glb");
    expect(hasAuthoredEraTownHall("bronze_age")).toBe(true);

    const resolved = resolveEraTownHall("bronze_age", "prehistoric");
    expect(resolved.art).toBe("authored");
    expect(resolved.showing_era).toBe("bronze_age");
    expect(resolved.model?.kind).toBe("glb");
    expect(basename(resolved.model?.url ?? "")).toBe("townhall-bronze-age-built.glb");
  });
});
