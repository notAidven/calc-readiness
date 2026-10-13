import {
  type DomainId,
  getNodesByDomain,
  getNodesByScope,
  getProductNodes,
} from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { buildCityViewModel } from "./city-view-model";
import {
  BUILDING_ARCHETYPES,
  ENDGAME_ATTACK_SCENE,
  getBuildingArchetype,
  getNeighborhoodDescriptor,
  NEIGHBORHOOD_DESCRIPTORS,
  type NeighborhoodDescriptor,
  resolveNeighborhood,
} from "./descriptors";

const ALL_DOMAINS = Object.keys(NEIGHBORHOOD_DESCRIPTORS) as DomainId[];

describe("resolveNeighborhood — the single generic path", () => {
  it("resolves D1 from the registry (nodes/edges NOT hard-coded)", () => {
    const resolved = resolveNeighborhood("D1");

    // Node set + order come straight from the registry, never a hard-coded list.
    expect(resolved.plots.map((plot) => plot.node_id)).toEqual(
      getNodesByDomain("D1")
        .filter((node) => node.product_scope === "mvp")
        .map((node) => node.id),
    );
    expect(resolved.plots).toHaveLength(getNodesByScope("mvp").length);
    expect(resolved.populated).toBe(true);
    expect(resolved.status).toBe("populated");
  });

  it("derives roads from registry prereqs intersected with the neighborhood", () => {
    const byNode = new Map(
      resolveNeighborhood("D1").plots.map((plot) => [
        plot.node_id,
        [...plot.road_sources].sort(),
      ]),
    );

    expect(byNode.get("NUM.S")).toEqual([]);
    expect(byNode.get("NUM.2")).toEqual(["NUM.F", "NUM.S"]);
    expect(byNode.get("NUM.4")).toEqual(["NUM.2", "NUM.3", "NUM.F", "NUM.S"]);
    expect(byNode.get("NUM.5")).toEqual(["NUM.F"]);
  });

  it("assigns a building archetype to every plot (unique authored positions)", () => {
    const plots = resolveNeighborhood("D1").plots;

    for (const plot of plots) {
      expect(BUILDING_ARCHETYPES[plot.archetype.id]).toBe(plot.archetype);
    }
    // Distinct answer-type archetypes are represented (proves per-node keying).
    const archetypeIds = new Set(plots.map((plot) => plot.archetype.id));
    expect(archetypeIds.size).toBeGreaterThan(1);
    // NUM.3 is authored as an `expression` item in the bank → expression workshop.
    expect(plots.find((plot) => plot.node_id === "NUM.3")?.archetype.id).toBe(
      "constructed_response",
    );

    const positionKeys = plots.map((plot) => `${plot.position.col},${plot.position.row}`);
    expect(new Set(positionKeys).size).toBe(plots.length);
  });

  it("carries the storm tuning from the descriptor, and no cosmetic catalog", () => {
    // `cosmetic_catalog` was resolved here beside the storm tuning, off
    // `CosmeticPreviewDescriptor`. Both left the generic pipeline with the 2026-08-03
    // sunset, so the absence is asserted where the presence used to be.
    const resolved = resolveNeighborhood("D1");
    expect(resolved.storm.clear_ratio).toBe(0.8);
    expect(resolved.storm.item_count).toBeGreaterThan(0);
    expect(Object.keys(resolved)).not.toContain("cosmetic_catalog");
  });

  it("defaults to D1", () => {
    expect(resolveNeighborhood().domain).toBe("D1");
  });
});

describe("MVP build fence — D1 populated, D2-D9 architected-only", () => {
  it("gives every in-product domain a descriptor slot", () => {
    const inProductDomains = new Set(getProductNodes().map((node) => node.domain));
    for (const domain of inProductDomains) {
      expect(NEIGHBORHOOD_DESCRIPTORS[domain]).toBeDefined();
      expect(getNeighborhoodDescriptor(domain).domain).toBe(domain);
    }
  });

  it("populates ONLY D1; every other domain is an empty architected slot", () => {
    const populated = ALL_DOMAINS.filter(
      (domain) => getNeighborhoodDescriptor(domain).status === "populated",
    );
    expect(populated).toEqual(["D1"]);

    for (const domain of ALL_DOMAINS) {
      const resolved = resolveNeighborhood(domain);
      if (domain === "D1") {
        expect(resolved.populated).toBe(true);
        expect(resolved.plots.length).toBeGreaterThan(0);
      } else {
        // Architected: typed + reachable through the same resolver, but empty.
        expect(resolved.status).toBe("architected");
        expect(resolved.populated).toBe(false);
        expect(resolved.plots).toHaveLength(0);
      }
    }
  });
});

describe("endgame attack scene — architected-only TYPE, never built", () => {
  it("declares the type with built:false and example calculus waves", () => {
    expect(ENDGAME_ATTACK_SCENE.built).toBe(false);
    expect(ENDGAME_ATTACK_SCENE.concept_source).toBe("Calculus I");
    expect(ENDGAME_ATTACK_SCENE.example_waves.map((wave) => wave.calculus_concept)).toEqual(
      ["limits", "derivatives", "integrals"],
    );
  });

  it("wires the example seam only on the populated D1 slot; architected slots have none", () => {
    const d1: NeighborhoodDescriptor = getNeighborhoodDescriptor("D1");
    expect(d1.attack).toBe(ENDGAME_ATTACK_SCENE);
    expect(d1.attack?.built).toBe(false);

    for (const domain of ALL_DOMAINS) {
      if (domain === "D1") {
        continue;
      }
      expect(getNeighborhoodDescriptor(domain).attack).toBeNull();
    }
  });
});

describe("getBuildingArchetype", () => {
  it("resolves the generic fallback archetype", () => {
    expect(getBuildingArchetype("generic").id).toBe("generic");
    expect(getBuildingArchetype("generic").silhouette).toBe("block");
  });
});

describe("citizen roles resolve through the same path as building archetypes", () => {
  it("gives every D1 plot a role, keyed on the node id (D-CIT17)", () => {
    // Keyed on the node id and NOT on the display name: `NUM.S` was renamed
    // "Town Hall" -> "City Bank" -> "Assembly Hall" and this map did not move either
    // time (D-ERA29 added a per-era subtitle on top, and that did not reach it). It is
    // also NOT keyed on
    // `gridworkId`, which lives in `apps/web` and this package cannot see.
    const roleByNode = new Map(
      resolveNeighborhood("D1").plots.map((plot) => [plot.node_id, plot.citizen_role]),
    );
    expect(roleByNode.get("NUM.2")).toBe("residence");
    expect(roleByNode.get("NUM.3")).toBe("school");
    // A lawn is somewhere to BE, not a fourth role family (design section 3).
    expect(roleByNode.get("NUM.4")).toBe("civic");
    expect(roleByNode.get("NUM.S")).toBe("civic");
    expect(roleByNode.get("NUM.F")).toBe("civic");
    expect(roleByNode.get("NUM.5")).toBe("civic");
    expect(roleByNode.size).toBe(6);
  });

  it("has exactly ONE residence and ONE school on D1", () => {
    // The whole tuning argument rests on this: one terrace carries most of the
    // housing, and the school houses nobody. If a second residence ever appears,
    // the pacing in section 8.5 needs re-deriving.
    const roles = resolveNeighborhood("D1").plots.map((plot) => plot.citizen_role);
    expect(roles.filter((role) => role === "residence")).toHaveLength(1);
    expect(roles.filter((role) => role === "school")).toHaveLength(1);
  });

  it("falls back to civic for a node the island never authored", () => {
    // D-CIT3's fallback: no building is ever role-less, and a future island gets a
    // working social life the day its buildings land.
    for (const descriptor of Object.values(NEIGHBORHOOD_DESCRIPTORS)) {
      expect(descriptor.default_citizen_role).toBe("civic");
    }
  });

  it("leaves an architected island with zero plots and therefore zero roles (D-CIT12)", () => {
    // D2-D10 resolve to zero plots, so the map is never read. Nothing throws.
    expect(resolveNeighborhood("D2").plots).toEqual([]);
    expect(NEIGHBORHOOD_DESCRIPTORS.D2.citizen_roles).toEqual({});
    expect(() => resolveNeighborhood("D10")).not.toThrow();
  });

  it("carries the role onto the view model, so the citizen derivation can read it", () => {
    // The role has to reach `CityBuildingView` or the web lane would have to thread
    // it, which is exactly what D-CIT17 exists to avoid.
    const vm = buildCityViewModel({ node_states: [] });
    const rowhouse = vm.buildings.find((building) => building.node_id === "NUM.2");
    expect(rowhouse?.citizen_role).toBe("residence");
  });

  it("does not read the answer-type archetype, which is a different axis", () => {
    // `BuildingArchetypeId` is derived from `answer_type` — how the learner ANSWERS,
    // not what the building IS. On D1 it groups four numeric halls together and
    // splits the school from the park, so a role that tracked it would be wrong.
    const plots = resolveNeighborhood("D1").plots;
    const school = plots.find((plot) => plot.node_id === "NUM.3");
    const park = plots.find((plot) => plot.node_id === "NUM.4");
    expect(school?.archetype.id).toBe(park?.archetype.id);
    expect(school?.citizen_role).not.toBe(park?.citizen_role);
  });
});
