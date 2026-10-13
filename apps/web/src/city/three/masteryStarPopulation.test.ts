import { ERA_ONE_CIVIC_TYPES, type EraOneCivicTypeId } from "@cr/game";
import { describe, expect, it } from "vitest";

import {
  D1_SKILL_IDS,
  type ResolvedBuildingModel,
  resolveBuildingModel,
} from "../buildingAssets";
import { civicPlacementId, civicTypeOf } from "../civic";
import { resolveCivicModel } from "../civicBuildings";
import { MASTERY_STAR_TOTAL } from "../masteryVisuals";
import { resolveTownHallModel, TOWN_HALL_ID } from "../townHall";
import { placementStars } from "./PlacedBuilding";

/**
 * **A MASTERY STAR RACK BELONGS TO A BUILDING THAT CAN EARN ONE.**
 *
 * ## The defect this exists for, measured rather than imagined
 *
 * Civic buildings became purchasable, and every bought one came up under an EMPTY GREY
 * 0-of-3 rack. Photographed on the live island before the fix, a Smokehouse and a
 * Longhouse each standing under three grey stars:
 * `output/civic/stars/before-6-civic-closeup.png`, attributed to the purchases (rather
 * than to the skill buildings beside them) by a pixel diff of the same camera one purchase
 * earlier: `output/civic/stars/before-4-diff-mask.png`.
 *
 * It is wrong twice. A civic building is BOUGHT, not mastered — it has no lesson, no
 * practice set and no `student_node_state` row — so a 0-of-3 rack is a progress bar for
 * progress that cannot exist, and it reads as *"you have not done this yet"*, which is
 * false. And era one RESERVES `#FFB703` for mastery: `MasteryStars` paints a filled star
 * that colour, and the style guide forbids it on a civic building. An empty rack standing
 * over one is that colour one fill rule away from the surface it may not appear on.
 *
 * ## Why this population, and why it needs a floor
 *
 * The failure mode here is SILENCE: a rack that renders for a building type nobody thought
 * about looks exactly like a rack that renders correctly, and `PlacedBuilding` needs a GPU,
 * so nothing headless renders it and nothing went red when the racks appeared.
 *
 * So the population is *"every placement `CitySurface.scenePlaced` can hand
 * `PlacedBuilding`"* — the behaviour, not the implementation — split by whether that kind
 * of building can earn mastery, and derived from the shipped registries so a seventh skill
 * or a fifth civic type joins it without an edit here. "No civic stars" passes trivially
 * over a city that contains no civic buildings, and "skill racks render" passes trivially
 * over a city with no skill buildings, so BOTH halves are floored and the composition is
 * asserted beside the floor: a floor of ten is satisfied by ten of either one alone.
 */

/** The stage a bought civic building arrives at: finished, from the moment it is paid for. */
const CIVIC_TYPES = Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[];

/**
 * Every placement the scene can be handed, paired with the model descriptor its own lane
 * resolves and with whether that KIND of building has mastery to show. Derived from the
 * two registries `scenePlaced` composes rather than listed out.
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
  readonly earnsMastery: boolean;
}[] = [
  ...D1_SKILL_IDS.map((nodeId) => ({
    label: `skill ${nodeId}`,
    nodeId,
    model: resolveBuildingModel(nodeId, "built"),
    earnsMastery: true,
  })),
  ...CIVIC_TYPES.map((type, index) => ({
    // The id the session mints, through the minter, so a change to the id scheme moves
    // this population with it instead of leaving it testing a shape nothing produces.
    label: `civic ${type}`,
    nodeId: civicPlacementId(type, index),
    model: resolveCivicModel(type),
    earnsMastery: false,
  })),
];

const EARNERS = PLACEMENTS.filter((p) => p.earnsMastery);
const BOUGHT = PLACEMENTS.filter((p) => !p.earnsMastery);

/**
 * The component's own source, read raw. Defaulted to the empty string rather than
 * asserted non-null here, because a glob that stopped matching would otherwise blow up at
 * import time with a message about `undefined` instead of failing where the claim is; the
 * floor in "is the component's only route to a rack" is what turns that into a real red.
 */
const COMPONENT_SOURCE: string =
  (
    import.meta.glob("./PlacedBuilding.tsx", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string | undefined>
  )["./PlacedBuilding.tsx"] ?? "";

describe("mastery stars are drawn for buildings that can earn them, and no others", () => {
  it("sweeps a real population of BOTH kinds, so neither half passes on emptiness", () => {
    // Floors under each half separately. A single floor over the whole set would be
    // satisfied by ten skill buildings and no civic ones — which is the city the "no
    // civic stars" claim is vacuous in, and exactly the city this repo had yesterday.
    expect(EARNERS.length).toBeGreaterThanOrEqual(6);
    expect(BOUGHT.length).toBeGreaterThanOrEqual(4);
    expect(PLACEMENTS).toHaveLength(EARNERS.length + BOUGHT.length);
    expect(new Set(PLACEMENTS.map((p) => p.nodeId)).size).toBe(PLACEMENTS.length);
    // And the two halves are the two CLASSES they claim to be, not two arbitrary slices:
    // every bought one is a civic placement id and no earner is.
    for (const { label, nodeId } of BOUGHT) {
      expect(civicTypeOf(nodeId), label).not.toBeNull();
    }
    for (const { label, nodeId } of EARNERS) {
      expect(civicTypeOf(nodeId), label).toBeNull();
    }
  });

  it("gives every topped-out SKILL building its rack, at every tier", () => {
    for (const { label, nodeId, model } of EARNERS) {
      expect(model?.stage, `${label} resolves a built model`).toBe("built");
      for (let mastery = 0; mastery <= MASTERY_STAR_TOTAL; mastery += 1) {
        const stars = placementStars(nodeId, mastery, model);
        expect(stars, `${label} at mastery ${mastery} has a rack`).not.toBeNull();
        expect(stars?.total, `${label} shows all ${MASTERY_STAR_TOTAL} slots`).toBe(
          MASTERY_STAR_TOTAL,
        );
        expect(stars?.filled, `${label} fills ${mastery}`).toBe(mastery);
      }
    }
  });

  it("gives a BOUGHT civic building no rack at all, at any tier", () => {
    for (const { label, nodeId, model } of BOUGHT) {
      // It IS standing and finished — so this is not "no stars because no building".
      expect(model?.kind, `${label} has art on the ground`).toBe("glb");
      expect(model?.stage, `${label} stands finished`).toBe("built");
      for (let mastery = 0; mastery <= MASTERY_STAR_TOTAL; mastery += 1) {
        expect(placementStars(nodeId, mastery, model), `${label} at ${mastery}`).toBeNull();
      }
    }
  });

  /**
   * The declared exception, asserted in both directions so it cannot quietly stop
   * describing anything: the HUB owes no rack and is not in the population above, because
   * it never reaches `PlacedBuilding` — it has its own component (`TownHall`, "no mastery
   * stars"). What makes that true is that it is in NEITHER lane `scenePlaced` composes.
   */
  it("keeps the hub out by the only thing that keeps it out: neither lane resolves it", () => {
    // RE-EXPRESSED, NOT LOOSENED, on the 2026-07-31 forward-merge: the skill resolver stopped
    // answering `null` for an unmapped id (it falls back to the neutral procedural shell now
    // the era roster makes such nodes placeable), so "the skill lane does not resolve the hub"
    // is spelled as no GLB rather than as no descriptor. A hub wired into the skill registry
    // would still fail here, which is the property this line is for.
    expect(resolveBuildingModel(TOWN_HALL_ID, "built").kind).not.toBe("glb");
    expect(resolveBuildingModel(TOWN_HALL_ID, "built").url).toBeNull();
    expect(civicTypeOf(TOWN_HALL_ID)).toBeNull();
    // …and it is a real building with real art, so this is an exemption for something
    // that exists rather than a line left behind by a deleted id.
    expect(resolveTownHallModel("built")?.kind).toBe("glb");
    expect(PLACEMENTS.some((p) => p.nodeId === TOWN_HALL_ID)).toBe(false);
  });

  /**
   * The decision above is only worth testing while it is the decision the component makes.
   * `PlacedBuilding` cannot be rendered headlessly, so this reads its source: the rack must
   * come from `placementStars` and the tier helper must be reachable through nothing else.
   */
  it("is the component's only route to a rack", () => {
    // The floor under the three claims below: every one of them is about a string this
    // file read off disk, and all three would be satisfiable by a source that failed to
    // load if they were phrased the other way round.
    expect(COMPONENT_SOURCE.length).toBeGreaterThan(1000);
    expect(COMPONENT_SOURCE).toContain("export function PlacedBuilding(");
    // The full three-argument call is named rather than left as a prefix match. The old
    // era-advance ceremony and its star stand-down were retired together; adding a fourth
    // presentation input here would reintroduce that deleted renderer's control path.
    expect(COMPONENT_SOURCE).toContain(
      "const stars = placementStars(nodeId, mastery, model)",
    );
    expect(COMPONENT_SOURCE).toContain("stars={stars}");
    // The tier helper is CALLED exactly once in this file — inside `placementStars`. A
    // second call site is a second, ungated way to raise a rack, which is the shape the
    // defect had. (Occurrences in the import and in prose are not call sites.)
    expect(COMPONENT_SOURCE.match(/masteryStarsFor\(/g)).toHaveLength(1);
  });
});
