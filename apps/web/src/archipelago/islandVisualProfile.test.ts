import { ERA_SEQUENCE } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { CURRENT_ERA_ID } from "../city/eraDressing";
import { islandGround } from "../city/islandGround";
import { resolveEraTownHall } from "../city/townHall";
import { islandManifestEntry } from "./islandManifest";
import { islandVisualProfile } from "./islandVisualProfile";

describe("the shared island visual profile", () => {
  it("derives every miniature surface from the runtime terrain and Hall registries", () => {
    expect(ERA_SEQUENCE).toHaveLength(10);
    for (const era of ERA_SEQUENCE) {
      const profile = islandVisualProfile(era.id);
      const manifest = islandManifestEntry(era.id);
      const ground = islandGround(era.id);
      const hall = resolveEraTownHall(era.id, CURRENT_ERA_ID);

      expect(profile.eraId, era.id).toBe(era.id);
      expect(profile.topology.source, era.id).toBe("authored-island-design");
      expect(profile.topology.facets, era.id).toBe(13);
      expect(profile.topology.landRadius, era.id).toBe(manifest.landRadius);
      expect(profile.topology.buildableRadius, era.id).toBe(manifest.buildableRadius);
      expect(profile.terrain.tones, era.id).toBe(ground.tones);
      expect(profile.terrain.design, era.id).toBe(ground.design);
      expect(profile.terrain.art, era.id).toBe(ground.art);
      expect(profile.hall.art, era.id).toBe(hall.art);
      expect(profile.hall.showingEraId, era.id).toBe(hall.showing_era);
      expect(profile.hall.model?.url ?? null, era.id).toBe(hall.model?.url ?? null);
    }
  });

  it("reports the completed terrain delivery separately from unresolved Hall inputs", () => {
    const missingTerrain = ERA_SEQUENCE.filter(
      (era) => islandVisualProfile(era.id).terrain.art === "unauthored",
    ).map((era) => era.id);
    const missingHall = ERA_SEQUENCE.filter(
      (era) => islandVisualProfile(era.id).hall.art !== "authored",
    ).map((era) => era.id);

    expect(missingTerrain).toEqual([]);
    expect(missingHall).toEqual(["renaissance"]);
    expect(missingHall).toHaveLength(1);
    for (const eraId of missingHall) {
      const hall = islandVisualProfile(eraId).hall;
      expect(hall.showingEraId, eraId).toBe(eraId);
      expect(hall.dependency, eraId).toMatch(/Town Hall/i);
    }
  });
});
