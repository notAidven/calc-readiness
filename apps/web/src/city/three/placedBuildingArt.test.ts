import { ERA_ONE_CIVIC_TYPES, type EraOneCivicTypeId } from "@cr/game";
import { describe, expect, it } from "vitest";

import {
  D1_SKILL_IDS,
  type ResolvedBuildingModel,
  resolveBuildingModel,
} from "../buildingAssets";
import { resolveCivicModel } from "../civicBuildings";
import { resolveTownHallModel, TOWN_HALL_ID } from "../townHall";
import { renderableArtUrl } from "./PlacedBuilding";

/**
 * **EVERY PLACEMENT THE CITY CAN HOLD HAS ART THE SCENE WILL ACTUALLY DRAW.**
 *
 * ## The defect this exists for, measured rather than imagined
 *
 * `PlacedBuilding` draws nothing unless it can find a built model — the right rule, since
 * a half-registered building should leave an empty pad rather than a stray procedural
 * block. It asked that question of ONE registry, the skill nodes', whose resolver returns
 * `null` for any id that is not a `NUM.*` node.
 *
 * So the first bought civic building was paid for, placed, counted in both capacity dials
 * and announced — and did not appear. The descriptor it had been handed was thrown away by
 * a second lookup that could not succeed for it. Nothing in the tree caught that:
 * `PlacedBuilding` needs a GPU, so no test rendered it, and every test that could see the
 * numbers saw the right numbers. It was found by photographing the live app
 * (`output/civic-standing-shot.mjs`) and finding empty grass.
 *
 * ## Why the population is "every placement the city can hold", not "every civic type"
 *
 * Because the defect was not about civic buildings; it was about a gate that only knew one
 * of the THREE registries this city has. Scoped to the class that happened to break, this
 * guard would pass over the next one — the hub is already the second, and a decorations
 * catalogue would be the fourth. So the population is the set of things
 * `CitySurface.scenePlaced` can put in front of `PlacedBuilding`, each paired with the
 * resolver its own lane owns, with a floor and a census under it.
 */

/**
 * Everything the scene can be handed, with the resolver whose descriptor it arrives with.
 * Derived from the shipped registries rather than listed, so a new type in either lane
 * shows up here on its own.
 */
const PLACEMENTS: readonly {
  readonly label: string;
  readonly nodeId: string;
  // Explicitly nullable rather than `ReturnType<typeof resolveBuildingModel>`: the skill
  // resolver stopped being nullable when the era roster landed (an unmapped node now falls
  // back to the neutral shell), while `resolveCivicModel` is still allowed to answer `null`
  // for an unauthored catalogue row. Deriving the union from one of the two resolvers hid
  // that asymmetry, which is the thing this file exists to hold both lanes to.
  readonly model: ResolvedBuildingModel | null;
}[] = [
  ...D1_SKILL_IDS.map((nodeId) => ({
    label: `skill ${nodeId}`,
    nodeId,
    model: resolveBuildingModel(nodeId, "built"),
  })),
  ...(Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[]).map((type, index) => ({
    // The id the session mints, not the type — which is exactly the shape that broke,
    // since it is nothing the skill registry has ever heard of.
    label: `civic ${type}`,
    nodeId: `civic:${type}:${index}`,
    model: resolveCivicModel(type),
  })),
];

describe("the scene's art gate knows every registry, not just the skill one", () => {
  it("sweeps a real population: all six skills and all four civic types", () => {
    // Floors and composition. A floor alone would be satisfied by ten of anything, and
    // the composition IS the claim — the gate broke because one class was missing.
    expect(PLACEMENTS.length).toBeGreaterThanOrEqual(10);
    expect(PLACEMENTS.filter((p) => p.label.startsWith("skill"))).toHaveLength(6);
    expect(
      PLACEMENTS.filter((p) => p.label.startsWith("civic")).length,
    ).toBeGreaterThanOrEqual(4);
    expect(new Set(PLACEMENTS.map((p) => p.nodeId)).size).toBe(PLACEMENTS.length);
  });

  it("resolves a drawable url for every one of them", () => {
    for (const { label, nodeId, model } of PLACEMENTS) {
      // Its own lane resolved a bundled GLB…
      expect(model?.kind, `${label} has a bundled model`).toBe("glb");
      // …and the scene's gate keeps it, which is the half that was broken.
      expect(renderableArtUrl(nodeId, model), `${label} is drawable`).toEqual(
        expect.stringContaining(".glb"),
      );
    }
  });

  it("catches the exact defect: a civic id through the SKILL registry alone", () => {
    // The injected version of what shipped, so the assertion above is demonstrably about
    // something. This is the lookup the gate used to make on its own, and it finds NO ART for
    // any bought building — which is why the material was spent on an empty plot.
    //
    // RE-EXPRESSED, NOT LOOSENED, on the 2026-07-31 forward-merge. `resolveBuildingModel`
    // stopped returning `null` when the era roster landed: an unmapped node now falls back to
    // the shared neutral procedural shell, because a placeable node that draws nothing is
    // worse than one that draws a plain box. So "the skill registry does not answer for this
    // id" is no longer spelled `null` — it is spelled `kind !== "glb"` with no url, and that
    // is what is asserted. The claim is unchanged and so is the defect it fails on: wire a
    // civic id into the skill registry with real art and `kind` becomes `"glb"` with a
    // truthy url, exactly as it already is for every skill node in `PLACEMENTS` above —
    // which is the positive control that keeps this from passing over an empty resolver.
    for (const type of Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[]) {
      const throughSkills = resolveBuildingModel(`civic:${type}:0`, "built");
      expect(throughSkills.kind, type).not.toBe("glb");
      expect(throughSkills.url, type).toBeNull();
    }
    // And the hub, which is the second registry and has always gone through its own
    // component — included so "the skill registry is not the whole answer" is stated over
    // more than one counterexample.
    expect(resolveBuildingModel(TOWN_HALL_ID, "built").kind).not.toBe("glb");
    expect(resolveBuildingModel(TOWN_HALL_ID, "built").url).toBeNull();
    expect(resolveTownHallModel("built")?.kind).toBe("glb");
  });

  /*
   * THE STAR RACK IS NOT ASSERTED HERE, deliberately, and this note is the pointer rather
   * than a second copy of the claim. `placementEarnsMastery` was added in this lane for the
   * same photograph (a bought Campfire standing under three grey stars), and the visuals
   * lane then built `placementStars` on top of it and swept the whole population in
   * `masteryStarPopulation.test.ts` — including the argument this file has no business
   * making, that era one RESERVES `#FFB703` for mastery. That file owns it.
   */

  it("still refuses to draw an unregistered id, which is what the gate is FOR", () => {
    // The loosening has to keep the original refusal, or an unauthored building would
    // start rendering a stray procedural block.
    expect(renderableArtUrl("NOT.A.NODE", null)).toBeNull();
    expect(renderableArtUrl("civic:not_a_type:0", null)).toBeNull();
    // A procedural early-stage descriptor is not a drawable file either: `site` and
    // `construction` carry `url: null` by construction, and the gate must not read them
    // as art present.
    expect(
      renderableArtUrl("civic:campfire:0", {
        node_id: "campfire",
        stage: "site",
        modelStage: "site",
        kind: "site",
        url: null,
      }),
    ).toBeNull();
  });
});
