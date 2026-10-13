import type { EraId } from "@cr/skill-graph";

import { CURRENT_ERA_ID } from "../city/eraDressing";
import type { EraIslandDesign } from "../city/islandDesign";
import {
  type IslandGroundDressing,
  type IslandTerrainTones,
  islandGround,
} from "../city/islandGround";
import { ISLAND_SHORE_FACETS, ISLAND_SHORE_PROFILE } from "../city/islandTopology";
import { type ResolvedEraTownHall, resolveEraTownHall } from "../city/townHall";
import { islandManifestEntry, type IslandVisual } from "./islandManifest";

export interface IslandVisualProfile {
  readonly eraId: EraId;
  readonly name: string;
  readonly topology: {
    readonly source: "runtime-faceted-shore" | "authored-island-design";
    readonly facets: number;
    readonly shoreProfile: typeof ISLAND_SHORE_PROFILE;
    readonly landRadius: number;
    readonly seaRadius: number;
    readonly buildableRadius: number;
    readonly footprintRadius: number;
    readonly visual: IslandVisual;
  };
  readonly terrain: {
    readonly art: IslandGroundDressing["art"];
    readonly tones: IslandTerrainTones;
    readonly design: EraIslandDesign | null;
    readonly pattern:
      | EraIslandDesign["groundPattern"]
      | "natural-tussock"
      | "worked-fields"
      | "unresolved";
    readonly shoreline: EraIslandDesign["shoreline"] | "shelving-shore";
    readonly dependency: string | null;
  };
  readonly hall: {
    readonly requestedEraId: EraId;
    readonly showingEraId: EraId;
    readonly art: ResolvedEraTownHall["art"];
    readonly model: ResolvedEraTownHall["model"];
    readonly dependency: string | null;
  };
}

function fallbackPattern(eraId: EraId, ground: IslandGroundDressing) {
  if (ground.art === "unauthored") {
    return "unresolved" as const;
  }
  return eraId === "neolithic" ? ("worked-fields" as const) : ("natural-tussock" as const);
}

/**
 * One read model for every compact island representation.
 *
 * It contains no Atlas-specific palette, Hall table, or silhouette. The city registries remain
 * the owners, so an incoming Evan terrain row or Hall GLB changes this profile automatically.
 */
export function islandVisualProfile(eraId: EraId): IslandVisualProfile {
  const manifest = islandManifestEntry(eraId);
  const ground = islandGround(eraId);
  const hall = resolveEraTownHall(eraId, CURRENT_ERA_ID);
  return {
    eraId,
    name: manifest.name,
    topology: {
      source: ground.design ? "authored-island-design" : "runtime-faceted-shore",
      facets: ground.design ? 13 : ISLAND_SHORE_FACETS,
      shoreProfile: ISLAND_SHORE_PROFILE,
      landRadius: manifest.landRadius,
      seaRadius: manifest.seaRadius,
      buildableRadius: manifest.buildableRadius,
      footprintRadius: manifest.footprintRadius,
      visual: manifest.visual,
    },
    terrain: {
      art: ground.art,
      tones: ground.tones,
      design: ground.design,
      pattern: ground.design?.groundPattern ?? fallbackPattern(eraId, ground),
      shoreline: ground.design?.shoreline ?? "shelving-shore",
      dependency:
        ground.art === "unauthored"
          ? `${manifest.name} terrain is awaiting Evan's typed island design.`
          : null,
    },
    hall: {
      requestedEraId: eraId,
      showingEraId: hall.showing_era,
      art: hall.art,
      model: hall.model,
      dependency:
        hall.art === "authored"
          ? null
          : `${manifest.name} Town Hall GLB is unresolved; its distinct procedural Hall is the explicit runtime fallback.`,
    },
  };
}
