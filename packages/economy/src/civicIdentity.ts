import {
  type CivicBuildingDefinition,
  type CivicBuildingId,
  findCivicBuilding,
} from "./civicCatalogue";

/**
 * Era one's runtime art keys predate the canonical civic catalogue ids. These four values
 * remain readable forever because dev snapshots and placed scene ids already carry them.
 */
export type LegacyEraOneCivicModelType =
  | "smokehouse"
  | "longhouse"
  | "campfire"
  | "water_spring";

/**
 * The one bridge between legacy Era 1 model keys and stable catalogue identity.
 *
 * `water_spring` deliberately maps to `prehistoric_storage_pit`: display names changed
 * after the stable catalogue id shipped, and a persisted key is not a description.
 */
export const LEGACY_ERA_ONE_CIVIC_IDS: Readonly<
  Record<LegacyEraOneCivicModelType, CivicBuildingId>
> = {
  smokehouse: "prehistoric_smokehouse",
  longhouse: "prehistoric_longhouse",
  campfire: "prehistoric_campfire",
  water_spring: "prehistoric_storage_pit",
};

const LEGACY_BY_CATALOGUE_ID: ReadonlyMap<CivicBuildingId, LegacyEraOneCivicModelType> =
  new Map(
    Object.entries(LEGACY_ERA_ONE_CIVIC_IDS).map(([modelType, catalogueId]) => [
      catalogueId,
      modelType as LegacyEraOneCivicModelType,
    ]),
  );

/** A canonical catalogue id or legacy Era 1 model key resolves to one row, never a guess. */
export function civicCatalogueRow(identity: string): CivicBuildingDefinition | null {
  const canonical =
    LEGACY_ERA_ONE_CIVIC_IDS[identity as LegacyEraOneCivicModelType] ?? identity;
  return findCivicBuilding(canonical);
}

/**
 * The runtime model key for a catalogue row. Era 1 keeps its shipped short keys; every
 * later era uses the stable catalogue id directly.
 */
export function civicModelTypeFor(
  row: CivicBuildingDefinition,
): LegacyEraOneCivicModelType | CivicBuildingId | null {
  if (row.era === "prehistoric") {
    return LEGACY_BY_CATALOGUE_ID.get(row.id) ?? null;
  }
  return row.id;
}

export interface ParsedCivicPlacementId {
  /** Original bytes. Existing ids are retained rather than rewritten on restore. */
  readonly placementId: string;
  readonly catalogueId: CivicBuildingId;
  readonly row: CivicBuildingDefinition;
  readonly modelType: LegacyEraOneCivicModelType | CivicBuildingId;
  readonly sequence: number;
  readonly legacy: boolean;
}

/**
 * Parse `civic:<catalogue-id>:<sequence>` plus the four legacy Era 1 type segments.
 * Exactly three non-empty parts and a canonical non-negative integer are required.
 */
export function parseCivicPlacementId(nodeId: string): ParsedCivicPlacementId | null {
  const parts = nodeId.split(":");
  if (parts.length !== 3 || parts[0] !== "civic") {
    return null;
  }
  const identity = parts[1] ?? "";
  const sequenceText = parts[2] ?? "";
  if (identity.length === 0 || !/^(0|[1-9]\d*)$/.test(sequenceText)) {
    return null;
  }
  const sequence = Number(sequenceText);
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    return null;
  }
  const row = civicCatalogueRow(identity);
  if (row === null) {
    return null;
  }
  const modelType = civicModelTypeFor(row);
  if (modelType === null) {
    return null;
  }
  return {
    placementId: nodeId,
    catalogueId: row.id,
    row,
    modelType,
    sequence,
    legacy: identity in LEGACY_ERA_ONE_CIVIC_IDS,
  };
}

/** Mint a new placement with the canonical catalogue id, never a legacy model key. */
export function canonicalCivicPlacementId(
  building: CivicBuildingDefinition | CivicBuildingId,
  sequence: number,
): string {
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new Error(`economy: civic placement sequence must be a non-negative integer.`);
  }
  const row = typeof building === "string" ? findCivicBuilding(building) : building;
  if (row === null) {
    throw new Error(`economy: cannot mint a civic placement for unknown id "${building}".`);
  }
  return `civic:${row.id}:${sequence}`;
}
