import { buildCityViewModel, getRequiredNodeIds } from "@cr/game";
import { getNodesByScope, getProductNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { createCityDevSession, type DevBuildStage } from "./citySession";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./townHall";
import type { CityLoad } from "./types";
import {
  BUILDABLE_RADIUS,
  defaultPlacements,
  footprintCells,
  footprintFor,
  type PlacedTransform,
  type Transform,
} from "./worldLayout";

/** Interpret a CityLoad exactly as the surface does, via the shared view model. */
function view(load: CityLoad) {
  return buildCityViewModel({
    node_states: load.node_states,
    neighborhood_state: load.neighborhood_state ?? null,
  });
}

/** The placement for a node, if any. */
function placementFor(load: CityLoad, nodeId: string): PlacedTransform | undefined {
  return (load.placements ?? []).find((p) => p.nodeId === nodeId);
}

const D1_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"] as const;

/**
 * The Town Hall is PRE-SEEDED at the island centre (design 2026-07-26) — the player
 * never places it. Its 2×2 footprint sits at the origin, so tests place skills CLEAR
 * of that centre block. `skillSpot` derives a valid, non-overlapping spot for a node
 * by reserving the pre-seeded hall (the same "reserve the hub" path the mock uses), so
 * a skill is never dropped on top of the hub.
 */
async function hallOf(
  session: ReturnType<typeof createCityDevSession>,
): Promise<PlacedTransform> {
  const hall = (await session.load()).town_hall;
  if (!hall) {
    throw new Error("expected a pre-seeded town hall");
  }
  return hall;
}

async function skillSpots(
  session: ReturnType<typeof createCityDevSession>,
  nodeIds: readonly string[],
): Promise<Map<string, Transform>> {
  const hall = await hallOf(session);
  return new Map(
    defaultPlacements(nodeIds, [hall], BUILDABLE_RADIUS).map(
      (t) => [t.nodeId, { col: t.col, row: t.row, rot: t.rot }] as const,
    ),
  );
}

async function spotFor(
  session: ReturnType<typeof createCityDevSession>,
  nodeId: string,
): Promise<Transform> {
  const spot = (await skillSpots(session, [nodeId])).get(nodeId);
  if (!spot) {
    throw new Error(`no reserved placement for ${nodeId}`);
  }
  return spot;
}

describe("createCityDevSession — MVP D1 loop (pre-seeded hub → placement → mastery)", () => {
  it("seeds every in-product node, while the diagnostic's scope stays the six", async () => {
    const cityNodeIds = (await createCityDevSession().load()).node_states.map(
      (state) => state.node_id,
    );

    // **THIS TEST USED TO ASSERT THE SIX-PLOT CEILING**, and it was right to: the city's
    // node list and the diagnostic's scope really were one derivation, and drift between
    // them really would have been a defect. They stopped being the same question when the
    // roster became the era's. The session now seeds the whole in-product registry, because
    // the roster GROWS while a session is alive (the era ceremony) and `placeSkill` no-ops
    // on a node with no row — see `CITY_NODE_IDS`.
    expect(cityNodeIds).toEqual(getProductNodes().map((node) => node.id));
    expect(cityNodeIds).toHaveLength(62);

    // ...and the separation, asserted in the direction that matters. The live diagnostic is
    // D1-only by an explicit product decision (era design §14 GC1), so if lifting the
    // city's ceiling had been done by widening `product_scope` this would be 62 and the
    // diagnostic would have silently grown with it.
    expect(getNodesByScope("mvp").map((node) => node.id)).toEqual([...D1_NODES]);
    // The city still OFFERS era one's six on era one's island: a seeded row is not a plot.
    expect(
      view(await createCityDevSession().load()).buildings.map((b) => b.node_id),
    ).toEqual([...D1_NODES]);
  });

  it("opens with the pre-seeded hub, no skills, no mastery, and no economy payload", async () => {
    const session = createCityDevSession();
    const load = await session.load();

    // The island opens with only the pre-seeded hub — no skills placed yet (the
    // free-placement feature builds the rest from here).
    expect(load.placements).toEqual([]);
    // The hub is present from the start, dead-centre on the origin (D-TH1, 2026-07-26).
    expect(load.town_hall).toMatchObject({
      nodeId: TOWN_HALL_ID,
      ...TOWN_HALL_CENTER_TRANSFORM,
    });

    const vm = view(load);
    expect(vm.storm.phase).toBe("locked");

    // No persistent-economy payload (deferred to Contracts §8).
    expect(load).not.toHaveProperty("wallet");
    expect(load).not.toHaveProperty("unlocks");
  });

  it("seeds a fresh onboarding city, pre-building the passed (unlocked) nodes", async () => {
    const session = createCityDevSession();

    // Dirty the session for real: place a skill and advance its mastery.
    await session.placeSkill("NUM.S", await spotFor(session, "NUM.S"));
    await session.advanceMasteryDev("NUM.S");
    expect((await session.load()).placements).not.toEqual([]);

    // The pretest hand-off: per-node placement seeds + the unlocked (placement>=2)
    // node ids. NUM.S (3) and NUM.2 (2) passed; NUM.F (1) and NUM.3 (0) did not.
    session.seedFromPlacement({ "NUM.S": 3, "NUM.F": 1, "NUM.2": 2, "NUM.3": 0 }, [
      "NUM.S",
      "NUM.2",
    ]);

    const load = await session.load();
    const byId = new Map(load.node_states.map((state) => [state.node_id, state]));

    // Blueprint outlines still reflect the pretest placement; missing nodes -> 0.
    expect(byId.get("NUM.S")?.placement_estimate).toBe(3);
    expect(byId.get("NUM.F")?.placement_estimate).toBe(1);
    expect(byId.get("NUM.2")?.placement_estimate).toBe(2);
    expect(byId.get("NUM.5")?.placement_estimate).toBe(0);

    // Test-out: PASSED nodes (placement >= 2) are PRE-BUILT to Complete but at 0
    // stars — mastery 0 while lesson_stage "done" / complete, so they render built
    // (via the lesson_stage rule) with 0/3 stars; stars are earned by practicing.
    const vmById = new Map(view(load).buildings.map((b) => [b.node_id, b]));
    for (const nodeId of ["NUM.S", "NUM.2"]) {
      const state = byId.get(nodeId);
      expect(state?.mastery).toBe(0);
      expect(state?.completion_status).toBe("complete");
      expect(state?.lesson_stage).toBe("done");
      expect(vmById.get(nodeId)?.construction_state).toBe("complete");
    }

    // FAILED nodes (placement 0/1) stay unbuilt: mastery 0, locked, not_started.
    for (const nodeId of ["NUM.F", "NUM.3", "NUM.4", "NUM.5"]) {
      const state = byId.get(nodeId);
      expect(state?.mastery).toBe(0);
      expect(state?.completion_status).toBe("locked");
      expect(state?.lesson_stage).toBe("not_started");
    }

    // The island returns to skills-empty (buildings drop from the unlock popup) and the
    // storm re-locks — but the pre-seeded hub STAYS (it is never cleared). Only 2 of 6
    // are pre-built, so the neighborhood is not ready and no checkpoint is set.
    expect(load.placements).toEqual([]);
    expect(load.town_hall).toMatchObject({ nodeId: TOWN_HALL_ID });
    expect(load.neighborhood_state ?? null).toBeNull();
    expect(view(load).storm.phase).toBe("locked");
  });

  it("pre-builds an unlocked node on placement even when it was not pre-seeded (server path)", async () => {
    const session = createCityDevSession();

    // Simulate the server-backed path: the placement estimate is known (NUM.F
    // passed, placement 2) but seedFromPlacement did NOT pre-build it (empty
    // unlocked list), so its mastery is still 0 until the building is placed.
    session.seedFromPlacement({ "NUM.F": 2 }, []);
    const spots = await skillSpots(session, ["NUM.F", "NUM.3"]);
    let building = view(await session.load()).buildings.find((b) => b.node_id === "NUM.F");
    expect(building?.mastery).toBe(0);
    expect(building?.construction_state).toBe("not_started");

    // Placing the unlocked (placement >= 2) node drops it in already built — at 0
    // stars (mastery 0), Complete via the lesson_stage "done" rule.
    await session.placeSkill("NUM.F", spots.get("NUM.F") as Transform);
    building = view(await session.load()).buildings.find((b) => b.node_id === "NUM.F");
    expect(building?.mastery).toBe(0);
    expect(building?.construction_state).toBe("complete");

    // A FAILED node (placement 0/1) still places unbuilt.
    await session.placeSkill("NUM.3", spots.get("NUM.3") as Transform);
    const failed = view(await session.load()).buildings.find((b) => b.node_id === "NUM.3");
    expect(failed?.mastery).toBe(0);
    expect(failed?.construction_state).toBe("not_started");
  });

  it("drops a skill at a free transform, once, without touching mastery (not a game write)", async () => {
    const session = createCityDevSession();
    const spot = await spotFor(session, "NUM.S");

    await session.placeSkill("NUM.S", spot);
    let load = await session.load();
    expect(placementFor(load, "NUM.S")).toMatchObject(spot);

    // Each skill is placeable once — re-placing it elsewhere is a no-op.
    await session.placeSkill("NUM.S", { col: spot.col + 4, row: spot.row, rot: 1 });
    // And an occupied cell cannot be overwritten by another skill.
    await session.placeSkill("NUM.F", spot);
    load = await session.load();
    expect(placementFor(load, "NUM.S")).toMatchObject(spot);
    expect(placementFor(load, "NUM.F")).toBeUndefined();

    // Placement leaves the node at its site stage (mastery untouched).
    const building = view(load).buildings.find((b) => b.node_id === "NUM.S");
    expect(building?.mastery).toBe(0);
    expect(building?.construction_state).toBe("not_started");
  });

  it("rejects an off-island / overlapping transform, and a skill on top of the hub", async () => {
    const session = createCityDevSession();
    const spot = await spotFor(session, "NUM.S");

    // Way off the island → rejected.
    await session.placeSkill("NUM.S", { col: 999, row: 999, rot: 0 });
    expect(placementFor(await session.load(), "NUM.S")).toBeUndefined();

    // On the ground → accepted; a second building overlapping it → rejected.
    await session.placeSkill("NUM.S", spot);
    await session.placeSkill("NUM.2", { col: spot.col, row: spot.row, rot: 0 });
    let load = await session.load();
    expect(placementFor(load, "NUM.S")).toBeDefined();
    expect(placementFor(load, "NUM.2")).toBeUndefined();

    // A skill dropped ON the pre-seeded hub (the origin cells) is rejected — the hub's
    // 2×2 footprint blocks it exactly like any building's.
    await session.placeSkill("NUM.5", { col: 0, row: 0, rot: 0 });
    load = await session.load();
    expect(placementFor(load, "NUM.5")).toBeUndefined();
  });

  it("moves an already-placed building spatially, leaving mastery + stage untouched", async () => {
    const session = createCityDevSession();

    // Place two skills clear of the hub; take one to a real mastery + Complete stage
    // so we can prove the move never disturbs node state.
    const spots = await skillSpots(session, ["NUM.S", "NUM.3"]);
    const sSpot = spots.get("NUM.S") as Transform;
    const threeSpot = spots.get("NUM.3") as Transform;
    await session.placeSkill("NUM.S", sSpot); // 2×2
    await session.placeSkill("NUM.3", threeSpot); // 1×1 bystander
    await session.advanceMasteryDev("NUM.S", 2);
    const before = view(await session.load()).buildings.find((b) => b.node_id === "NUM.S");
    expect(before?.mastery).toBe(2);
    expect(before?.construction_state).toBe("complete");

    // Drop it back onto its OWN spot, rotated — a valid move (self ignored) that
    // proves relocation leaves node state alone.
    await session.moveSkill("NUM.S", { ...sSpot, rot: 1 });
    let load = await session.load();
    expect(placementFor(load, "NUM.S")).toMatchObject({ ...sSpot, rot: 1 });

    // Purely spatial: mastery + construction stage are unchanged, and the
    // bystander building never moved.
    const after = view(load).buildings.find((b) => b.node_id === "NUM.S");
    expect(after?.mastery).toBe(2);
    expect(after?.construction_state).toBe("complete");
    expect(placementFor(load, "NUM.3")).toMatchObject(threeSpot);

    // A move overlapping the OTHER building, or off the island, is a no-op — the
    // building stays exactly where it was.
    await session.moveSkill("NUM.S", { ...threeSpot, rot: 0 }); // would cover the bystander
    await session.moveSkill("NUM.S", { col: 999, row: 999, rot: 0 });
    load = await session.load();
    expect(placementFor(load, "NUM.S")).toMatchObject({ ...sSpot, rot: 1 });

    // Moving a NOT-yet-placed node never drops one in (only placeSkill does).
    await session.moveSkill("NUM.F", { col: -3, row: 0, rot: 0 });
    expect(placementFor(await session.load(), "NUM.F")).toBeUndefined();
  });

  it("advances mastery only for a PLACED skill (dev stand-in, never a game write)", async () => {
    const session = createCityDevSession();

    // Unplaced skill does not advance.
    await session.advanceMasteryDev("NUM.F");
    expect(
      view(await session.load()).buildings.find((b) => b.node_id === "NUM.F")?.mastery,
    ).toBe(0);

    // Placed skill advances and climbs its build phases.
    await session.placeSkill("NUM.F", await spotFor(session, "NUM.F"));
    await session.advanceMasteryDev("NUM.F");
    expect(
      view(await session.load()).buildings.find((b) => b.node_id === "NUM.F")?.mastery,
    ).toBe(1);
  });

  it("forces a PLACED node's rendered construction stage via the dev stage override", async () => {
    const session = createCityDevSession();

    // The override is a safe no-op for an unplaced skill (stays not_started).
    await session.setStageDev("NUM.5", "built");
    expect(
      view(await session.load()).buildings.find((b) => b.node_id === "NUM.5")
        ?.construction_state,
    ).toBe("not_started");

    await session.placeSkill("NUM.5", await spotFor(session, "NUM.5"));

    // Each forced stage derives the matching construction_state the renderer reads.
    // Under the 3-step model the "built" override lands on Complete (a finished
    // practice set), not the legacy "unfinished".
    const cases: [DevBuildStage, string][] = [
      ["construction", "practice"],
      ["built", "complete"],
      ["site", "not_started"],
    ];
    for (const [stage, expected] of cases) {
      await session.setStageDev("NUM.5", stage);
      const building = view(await session.load()).buildings.find(
        (b) => b.node_id === "NUM.5",
      );
      expect(building?.construction_state).toBe(expected);
    }
  });

  it("markLessonTaught advances Foundation → Construction (lesson_stage practice, no mastery)", async () => {
    const session = createCityDevSession();

    // No-op for an unplaced skill (stays a fresh, not-started Foundation).
    await session.markLessonTaught("NUM.5");
    let building = view(await session.load()).buildings.find((b) => b.node_id === "NUM.5");
    expect(building?.construction_state).toBe("not_started");

    // A placed, still-Foundation node advances to the Construction stage when the
    // teaching + CFU are done — WITHOUT touching mastery (practice hasn't run yet).
    await session.placeSkill("NUM.5", await spotFor(session, "NUM.5"));
    await session.markLessonTaught("NUM.5");
    building = view(await session.load()).buildings.find((b) => b.node_id === "NUM.5");
    expect(building?.construction_state).toBe("practice");
    expect(building?.mastery).toBe(0);

    // Finishing the practice set then completes it (Complete/built), regardless of
    // the score — the intermediate signal and the completion signal are distinct.
    await session.advanceMasteryDev("NUM.5", 1);
    building = view(await session.load()).buildings.find((b) => b.node_id === "NUM.5");
    expect(building?.construction_state).toBe("complete");
    expect(building?.mastery).toBe(1);

    // Monotonic: re-taught after completion is a no-op (never regresses to practice).
    await session.markLessonTaught("NUM.5");
    building = view(await session.load()).buildings.find((b) => b.node_id === "NUM.5");
    expect(building?.construction_state).toBe("complete");
  });

  it("revisit practice on a Complete building stays Complete (markLessonTaught truly monotonic)", async () => {
    // A BELOW-BAR finished practice (mastery 1) is Complete. #38's revisit menu can
    // fire markLessonTaught again (Practice set -> startPractice -> onEnterPractice);
    // it must NOT regress the Complete building back to Construction.
    const belowBar = createCityDevSession();
    await belowBar.placeSkill("NUM.F", await spotFor(belowBar, "NUM.F"));
    await belowBar.markLessonTaught("NUM.F"); // Foundation -> Construction
    await belowBar.advanceMasteryDev("NUM.F", 1); // finish practice below bar -> Complete
    await belowBar.markLessonTaught("NUM.F"); // revisit re-fires -> must stay Complete
    let load = await belowBar.load();
    const node = load.node_states.find((s) => s.node_id === "NUM.F");
    expect(
      view(load).buildings.find((b) => b.node_id === "NUM.F")?.construction_state,
    ).toBe("complete");
    expect(node?.lesson_stage).toBe("done");
    expect(node?.completion_status).toBe("complete");
    expect(node?.mastery).toBe(1);

    // A TESTED-OUT building drops in Complete at 0 stars (mastery 0); it is likewise
    // never regressed on revisit — the guard keys off completion_status "complete"
    // (NOT mastery), so even a 0-star Complete building holds its stage.
    const testedOut = createCityDevSession();
    testedOut.seedFromPlacement({ "NUM.S": 3 }, ["NUM.S"]);
    await testedOut.placeSkill("NUM.S", await spotFor(testedOut, "NUM.S"));
    await testedOut.markLessonTaught("NUM.S");
    load = await testedOut.load();
    const mastered = view(load).buildings.find((b) => b.node_id === "NUM.S");
    expect(mastered?.construction_state).toBe("complete");
    expect(mastered?.mastery).toBe(0);
    expect(load.node_states.find((s) => s.node_id === "NUM.S")?.lesson_stage).toBe("done");
  });

  it("a tested-out Complete building (0 stars) earns stars by practicing, staying Complete", async () => {
    // Test out NUM.S in the diagnostic, then place it: it drops in Complete at 0 stars.
    const session = createCityDevSession();
    session.seedFromPlacement({ "NUM.S": 3 }, ["NUM.S"]);
    await session.placeSkill("NUM.S", await spotFor(session, "NUM.S"));
    let building = view(await session.load()).buildings.find((b) => b.node_id === "NUM.S");
    expect(building?.construction_state).toBe("complete");
    expect(building?.mastery).toBe(0);

    // Practicing the already-built skill (the callout's "Practice" entry ->
    // resumeAtPractice -> advanceMasteryDev) raises its stars WITHOUT leaving the
    // Complete stage — 0 -> 2, still Complete/built.
    await session.advanceMasteryDev("NUM.S", 2);
    building = view(await session.load()).buildings.find((b) => b.node_id === "NUM.S");
    expect(building?.mastery).toBe(2);
    expect(building?.construction_state).toBe("complete");

    // Monotonic: a later below-bar practice never lowers the earned stars.
    await session.advanceMasteryDev("NUM.S", 1);
    building = view(await session.load()).buildings.find((b) => b.node_id === "NUM.S");
    expect(building?.mastery).toBe(2);
    expect(building?.construction_state).toBe("complete");
  });

  it("records the evidenced mastery from practice (monotonic, never lowers)", async () => {
    const session = createCityDevSession();
    await session.placeSkill("NUM.F", await spotFor(session, "NUM.F"));

    // A completed practice set reports its exact mastery (4/5 = 2 "Mastered"),
    // not the +1 dev step — the building jumps straight to 2.
    await session.advanceMasteryDev("NUM.F", 2);
    let building = view(await session.load()).buildings.find((b) => b.node_id === "NUM.F");
    expect(building?.mastery).toBe(2);
    expect(building?.construction_state).not.toBe("not_started");

    // Mastery is monotonic: a later below-bar set (mastery 1) never lowers it.
    await session.advanceMasteryDev("NUM.F", 1);
    building = view(await session.load()).buildings.find((b) => b.node_id === "NUM.F");
    expect(building?.mastery).toBe(2);

    // A gold set (5/5 = 3) still raises it.
    await session.advanceMasteryDev("NUM.F", 3);
    building = view(await session.load()).buildings.find((b) => b.node_id === "NUM.F");
    expect(building?.mastery).toBe(3);
  });

  it("stays fail-closed: attempting the storm before readiness never clears the checkpoint", async () => {
    const session = createCityDevSession();

    const result = await session.attemptStorm("D1");
    expect(result.cleared).toBe(true);
    expect(result.checkpoint_cleared).toBe(false);
    expect(view(await session.load()).storm.phase).toBe("locked");
  });

  it("places + masters all six, clears the checkpoint, and never writes mastery", async () => {
    const session = createCityDevSession();

    // Drop every skill onto a valid, non-overlapping transform. Reserving the
    // pre-seeded hub keeps the hall and the six skills mutually clear (the hall is
    // not one of the six and is already on the board).
    const layout = await skillSpots(session, D1_NODES);
    for (const nodeId of D1_NODES) {
      const spot = layout.get(nodeId);
      if (!spot) {
        throw new Error(`no reserved placement for ${nodeId}`);
      }
      await session.placeSkill(nodeId, spot);
    }
    expect((await session.load()).placements).toHaveLength(D1_NODES.length);

    // Advance every placed node to mastery >= 2 via the DEV mastery/lesson stand-in.
    for (let round = 0; round < 2; round += 1) {
      const snapshot = await session.load();
      for (const state of snapshot.node_states) {
        if (state.mastery < 2) {
          await session.advanceMasteryDev(state.node_id);
        }
      }
    }

    const readyLoad = await session.load();
    let vm = view(readyLoad);
    expect(vm.storm.phase).toBe("ready");
    for (const nodeId of getRequiredNodeIds("D1")) {
      const building = vm.buildings.find((item) => item.node_id === nodeId);
      expect(building?.mastery).toBeGreaterThanOrEqual(2);
    }

    const masteryBefore = new Map(
      readyLoad.node_states.map((state) => [state.node_id, state.mastery]),
    );

    // STORM: the game grades locally and clears the checkpoint via the game-owned
    // in-memory CheckpointWriter — no economy service, no mastery write.
    const storm = await session.attemptStorm("D1");
    expect(storm.cleared).toBe(true);
    expect(storm.checkpoint_cleared).toBe(true);

    const clearedLoad = await session.load();
    vm = view(clearedLoad);
    expect(vm.storm.phase).toBe("cleared");
    expect(clearedLoad.neighborhood_state?.checkpoint_cleared).toBe(true);

    // Frozen boundary: no node's mastery changed across the storm flow.
    for (const state of clearedLoad.node_states) {
      expect(state.mastery).toBe(masteryBefore.get(state.node_id));
    }

    // Replaying a cleared storm stays cleared and is side-effect-free.
    const replay = await session.attemptStorm("D1");
    expect(replay.cleared).toBe(true);
    expect(replay.checkpoint_cleared).toBe(true);
    expect(view(await session.load()).storm.phase).toBe("cleared");
  });
});

describe("createCityDevSession — the Town Hall (pre-seeded island hub, movable)", () => {
  it("is present on a fresh island with no player action, seated at the centre (3×2)", async () => {
    // The hub already exists from the start — no founding step (design 2026-07-26).
    const session = createCityDevSession();
    const load = await session.load();
    expect(load.town_hall).toMatchObject({
      nodeId: TOWN_HALL_ID,
      ...TOWN_HALL_CENTER_TRANSFORM,
    });
    // The 3×2 hub covers six cells (Z centred; the odd width leans one cell east).
    const hall = load.town_hall as PlacedTransform;
    expect(new Set(footprintCells(hall, footprintFor(hall.nodeId)))).toEqual(
      new Set(["-1,-1", "0,-1", "1,-1", "-1,0", "0,0", "1,0"]),
    );
  });

  it("its 3×2 footprint blocks a skill dropped on top of it", async () => {
    const session = createCityDevSession();
    // The hub sits at the origin cells; a skill overlapping them is rejected...
    await session.placeSkill("NUM.5", { col: 0, row: 0, rot: 0 });
    expect(placementFor(await session.load(), "NUM.5")).toBeUndefined();
    // ...clear ground away from the centre is fine.
    await session.placeSkill("NUM.5", await spotFor(session, "NUM.5"));
    expect(placementFor(await session.load(), "NUM.5")).toBeDefined();
  });

  it("moves the pre-seeded hall spatially (ignore-self); off-island / overlapping is a no-op", async () => {
    const session = createCityDevSession();
    // A 1×1 bystander clear of the centre.
    const bystander = await spotFor(session, "NUM.3");
    await session.placeSkill("NUM.3", bystander);

    // Relocate one cell east + rotate (its own footprint is ignored), then back home.
    await session.moveTownHall({ col: 0, row: -1, rot: 1 });
    expect((await session.load()).town_hall).toMatchObject({ col: 0, row: -1, rot: 1 });
    await session.moveTownHall({ ...TOWN_HALL_CENTER_TRANSFORM });
    expect((await session.load()).town_hall).toMatchObject({
      ...TOWN_HALL_CENTER_TRANSFORM,
    });

    // Overlapping the bystander, or leaving the island, is a no-op.
    await session.moveTownHall({ col: bystander.col, row: bystander.row, rot: 0 });
    await session.moveTownHall({ col: 999, row: 999, rot: 0 });
    expect((await session.load()).town_hall).toMatchObject({
      ...TOWN_HALL_CENTER_TRANSFORM,
    });
  });

  it("keeps the pre-seeded hub on a fresh diagnostic seed (never cleared)", async () => {
    const session = createCityDevSession();
    // Move it somewhere valid for the 3×2, then a fresh onboarding seed resets it home.
    await session.moveTownHall({ col: 1, row: 1, rot: 0 });
    expect((await session.load()).town_hall).toMatchObject({ col: 1, row: 1 });

    session.seedFromPlacement({ "NUM.S": 3 }, ["NUM.S"]);
    expect((await session.load()).town_hall).toMatchObject({
      nodeId: TOWN_HALL_ID,
      ...TOWN_HALL_CENTER_TRANSFORM,
    });
    // Skills are placeable immediately (no first-placement gate).
    await session.placeSkill("NUM.S", await spotFor(session, "NUM.S"));
    expect((await session.load()).placements).not.toEqual([]);
  });

  it("MIGRATION: a restored pre-change snapshot with no hall gains one", async () => {
    // Dev-persistence snapshots saved before the pre-seed change carry no `town_hall`.
    // Restoring one must still end up with a hub rather than an island with no centre.
    const session = createCityDevSession({
      node_states: [],
      neighborhood_states: [],
      placements: [],
      town_hall: null,
    });
    expect((await session.load()).town_hall).toMatchObject({
      nodeId: TOWN_HALL_ID,
      ...TOWN_HALL_CENTER_TRANSFORM,
    });
  });

  it("MIGRATION: a restored snapshot with a skill on the centre gets its hub clear of it", async () => {
    // A (hypothetical) pre-change snapshot whose skill sits on the origin: the migrated
    // hub must NOT be dropped on top of it — it falls back to the nearest open cell.
    const onCentre: PlacedTransform = { nodeId: "NUM.S", col: 0, row: 0, rot: 0 };
    const session = createCityDevSession({
      node_states: [],
      neighborhood_states: [],
      placements: [onCentre],
      town_hall: null,
    });
    const load = await session.load();
    const hall = load.town_hall as PlacedTransform;
    expect(hall).toBeTruthy();
    // The hub's cells never overlap the skill sitting at the origin (each measured with
    // its own footprint: the skill 2×2, the hub 3×2).
    const skillCells = new Set(footprintCells(onCentre, footprintFor(onCentre.nodeId)));
    for (const cell of footprintCells(hall, footprintFor(hall.nodeId))) {
      expect(skillCells.has(cell)).toBe(false);
    }
  });

  it("restores a moved hall from a dev snapshot (transform preserved)", async () => {
    const session = createCityDevSession({
      node_states: [],
      neighborhood_states: [],
      placements: [],
      town_hall: { nodeId: TOWN_HALL_ID, col: 2, row: -1, rot: 0 },
    });
    expect((await session.load()).town_hall).toMatchObject({ col: 2, row: -1 });
  });
});
