import {
  civicBuildingOrThrow,
  civicCatalogueForEra,
  civicCatalogueRow,
  civicModelTypeFor,
  LEGACY_ERA_ONE_CIVIC_IDS,
} from "@cr/economy";
import { ERA_ONE_CIVIC_TYPES } from "@cr/game";
import { describe, expect, it } from "vitest";

import { snapshotFromLoad } from "../devPersistence/devSession";
import { createCityDevSession } from "./citySession";
import * as civicIdentity from "./civic";
import { civicTypeOf } from "./civic";
import { footprintFor } from "./worldLayout";

interface ParsedCivicPlacement {
  readonly placementId: string;
  readonly catalogueId: string;
  readonly modelType: string;
  readonly sequence: number;
  readonly legacy: boolean;
}

function parser(): (nodeId: string) => ParsedCivicPlacement | null {
  const candidate = (
    civicIdentity as typeof civicIdentity & {
      parseCivicPlacementId?: (nodeId: string) => ParsedCivicPlacement | null;
    }
  ).parseCivicPlacementId;
  expect(candidate, "one strict civic placement-id parser is exported").toBeTypeOf(
    "function",
  );
  return candidate as NonNullable<typeof candidate>;
}

describe("civic placement identity across model-backed eras", () => {
  it("keeps the Era 1 legacy bridge bijective and value-identical to its catalogue rows", () => {
    const entries = Object.entries(LEGACY_ERA_ONE_CIVIC_IDS);
    expect(entries).toHaveLength(4);
    expect(new Set(entries.map(([, id]) => id)).size).toBe(4);
    expect(entries.map(([modelType]) => modelType).sort()).toEqual(
      Object.keys(ERA_ONE_CIVIC_TYPES).sort(),
    );
    expect(entries.map(([, id]) => id).sort()).toEqual(
      civicCatalogueForEra("prehistoric")
        .map((row) => row.id)
        .sort(),
    );

    for (const [modelType, catalogueId] of entries) {
      const legacy = ERA_ONE_CIVIC_TYPES[modelType as keyof typeof ERA_ONE_CIVIC_TYPES];
      const row = civicCatalogueRow(catalogueId);
      expect(row, modelType).not.toBeNull();
      expect(civicModelTypeFor(row as NonNullable<typeof row>), catalogueId).toBe(
        modelType,
      );
      expect(row?.name).toBe(legacy.name);
      expect(row?.cost).toBe(legacy.cost);
      expect(row?.footprint).toEqual({
        width: legacy.footprint[0],
        depth: legacy.footprint[1],
      });
      expect(row?.provides).toEqual({
        livability: legacy.livability,
        happiness: legacy.happiness,
      });
    }
  });

  it("parses canonical Era 2/3 ids and legacy Era 1 ids through one helper", () => {
    const parse = parser();

    expect(parse("civic:bronze_age_terraced_fields:7")).toMatchObject({
      catalogueId: "bronze_age_terraced_fields",
      modelType: "bronze_age_terraced_fields",
      sequence: 7,
      legacy: false,
    });
    expect(parse("civic:cyberpunk_vertical_farm:9")).toMatchObject({
      catalogueId: "cyberpunk_vertical_farm",
      modelType: "cyberpunk_vertical_farm",
      sequence: 9,
      legacy: false,
    });
    expect(parse("civic:neolithic_village_well:0")).toMatchObject({
      catalogueId: "neolithic_village_well",
      modelType: "neolithic_village_well",
      sequence: 0,
      legacy: false,
    });
    expect(parse("civic:water_spring:3")).toMatchObject({
      catalogueId: "prehistoric_storage_pit",
      modelType: "water_spring",
      sequence: 3,
      legacy: true,
    });
    expect(parse("civic:prehistoric_storage_pit:4")).toMatchObject({
      catalogueId: "prehistoric_storage_pit",
      modelType: "water_spring",
      sequence: 4,
      legacy: false,
    });

    for (const malformed of [
      "civic:bronze_age_terraced_fields:preview",
      "civic:bronze_age_terraced_fields:-1",
      "civic:bronze_age_terraced_fields:1:extra",
      "civic:not_a_building:1",
      "civic::1",
      "civic:campfire:",
    ]) {
      expect(parse(malformed), malformed).toBeNull();
    }
  });

  it("keeps the existing civicTypeOf compatibility view over the strict parser", () => {
    expect(civicTypeOf("civic:water_spring:3")).toBe("water_spring");
    expect(civicTypeOf("civic:prehistoric_storage_pit:4")).toBe("water_spring");
    expect(civicTypeOf("civic:bronze_age_terraced_fields:7")).toBe(
      "bronze_age_terraced_fields",
    );
    expect(civicTypeOf("civic:bronze_age_terraced_fields:preview")).toBeNull();
  });

  it("restores every known canonical id byte-for-byte and drops malformed ids", async () => {
    const valid = [
      { nodeId: "civic:prehistoric_longhouse:1", col: -5, row: -4, rot: 0 },
      { nodeId: "civic:neolithic_granary:3", col: 3, row: -4, rot: 1 },
      { nodeId: "civic:bronze_age_terraced_fields:8", col: 4, row: 2, rot: 3 },
      { nodeId: "civic:water_spring:12", col: -4, row: 3, rot: 2 },
    ] as const;
    const session = createCityDevSession({
      node_states: [],
      neighborhood_states: [],
      placements: [],
      civic: [
        ...valid,
        { nodeId: "civic:bronze_age_terraced_fields:preview", col: 0, row: 0, rot: 0 },
        { nodeId: "civic:not_a_building:9", col: 1, row: 1, rot: 0 },
      ],
    });

    expect((await session.load()).civic).toEqual(valid);
  });

  it("uses the parsed catalogue row for every footprint, including the Bronze 1x2", () => {
    const bronze = civicBuildingOrThrow("bronze_age_terraced_fields");
    expect(footprintFor("civic:bronze_age_terraced_fields:0")).toEqual({
      w: bronze.footprint.width,
      d: bronze.footprint.depth,
    });
    expect(footprintFor("civic:bronze_age_terraced_fields:0")).toEqual({ w: 1, d: 2 });
    expect(footprintFor("civic:water_spring:3")).toEqual({ w: 1, d: 1 });
  });

  it("omits the retired counter from new snapshots but preserves a restored legacy debt", async () => {
    const fresh = snapshotFromLoad(await createCityDevSession().load());
    expect(fresh).not.toHaveProperty("civic_material_spent");

    const legacy = createCityDevSession({
      node_states: [],
      neighborhood_states: [],
      placements: [],
      civic: [{ nodeId: "civic:water_spring:3", col: 2, row: 2, rot: 0 }],
      civic_material_spent: 120,
    });
    const legacySnapshot = snapshotFromLoad(await legacy.load());
    expect(legacy.civicMaterialSpent()).toBe(120);
    expect(legacySnapshot.civic_material_spent).toBe(120);
  });
});
