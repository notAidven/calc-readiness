import { GOLD_MASTERY } from "@cr/mastery-service";
import { getEraOrThrow } from "@cr/skill-graph";
import { afterEach, expect, test } from "vitest";

import { createArchipelagoSession } from "../archipelago/archipelagoSession";
import { createCityDevSession } from "../city/citySession";
import { TOWN_HALL_ID } from "../city/townHall";
import { resetCityEra, setCityEraForPreview } from "../city/useCityEra";
import { createPresenterLf1Session, PRESENTER_LESSON_NODE_ID } from "./PresenterLessonDemo";
import { presenterFixtureFor } from "./presenterFixtures";
import { buildPresenterEra, presenterEraBuildPlan } from "./presenterState";

afterEach(() => {
  resetCityEra();
});

test("LF.1 lesson and practice completion leave the Era 2 RAD.3 row byte-identical", async () => {
  const fixture = presenterFixtureFor({
    enabled: true,
    legacy: false,
    preset: "bronze-city",
    surface: "city",
    eraId: "neolithic",
  });
  const eraTwo = createCityDevSession(null, fixture.city.seed);
  const rad3Before = JSON.stringify(
    (await eraTwo.load()).node_states.find((state) => state.node_id === "RAD.3"),
  );
  expect(rad3Before).not.toBeUndefined();

  const lesson = createPresenterLf1Session("lesson");
  await lesson.markLessonTaught(PRESENTER_LESSON_NODE_ID);
  expect(
    (await lesson.load()).node_states.find(
      (state) => state.node_id === PRESENTER_LESSON_NODE_ID,
    ),
  ).toMatchObject({
    lesson_stage: "practice",
    completion_status: "in_progress",
  });

  const practice = createPresenterLf1Session("practice");
  await practice.advanceMasteryDev(PRESENTER_LESSON_NODE_ID, 3);
  expect(
    (await practice.load()).node_states.find(
      (state) => state.node_id === PRESENTER_LESSON_NODE_ID,
    ),
  ).toMatchObject({
    mastery: 3,
    lesson_stage: "done",
    completion_status: "complete",
  });

  const rad3After = JSON.stringify(
    (await eraTwo.load()).node_states.find((state) => state.node_id === "RAD.3"),
  );
  expect(rad3After).toBe(rad3Before);
});

test("an already-founded target era resets with one real unbuilt target, civics, and roads", async () => {
  setCityEraForPreview("bronze_age");
  const fixture = presenterFixtureFor({
    enabled: true,
    legacy: false,
    preset: "bronze-city",
    surface: "city",
    eraId: "bronze_age",
  });
  const session = createArchipelagoSession({
    initial: createCityDevSession(null, fixture.city.seed),
    standingEra: "bronze_age",
    stashed: fixture.archipelago.islands.filter((island) => island.eraId !== "bronze_age"),
    makeIsland: (snapshot) => createCityDevSession(snapshot),
    presenterMutationsEnabled: true,
  });
  const target = getEraOrThrow("cyberpunk");
  const before = await session.load();
  expect(session.islands()).toContain(target.id);
  const plan = presenterEraBuildPlan(target.id);
  expect(
    before.node_states.find((state) => state.node_id === plan.unbuiltNodeId),
  ).toMatchObject({
    mastery: 0,
    lesson_stage: "not_started",
    completion_status: "locked",
  });

  const result = await buildPresenterEra(session, target.id);
  const built = await session.load();
  expect(result).toEqual({
    eraId: target.id,
    skillCount: target.nodes.length,
    civicCount: plan.civicPlacements.length,
    roadCount: plan.roadCells.length,
  });
  expect(session.standing()).toBe(target.id);
  expect(session.islands()).toContain(target.id);
  expect(
    (built.placements ?? [])
      .filter((placement) => target.nodes.includes(placement.nodeId))
      .map((placement) => placement.nodeId),
  ).toEqual(target.nodes.filter((nodeId) => nodeId !== plan.unbuiltNodeId));
  expect(
    built.placements?.some((placement) => placement.nodeId === plan.unbuiltNodeId),
    `${plan.unbuiltNodeId} must remain absent from the island`,
  ).toBe(false);
  expect(
    built.placements?.some((placement) => placement.nodeId === plan.focusNodeId),
    `${plan.focusNodeId} must retain the lesson shortcut`,
  ).toBe(true);
  for (const nodeId of target.nodes) {
    expect(
      built.node_states.find((state) => state.node_id === nodeId),
      `${nodeId} was not progression-ready`,
    ).toMatchObject(
      plan.completedNodeIds.includes(nodeId)
        ? {
            mastery: GOLD_MASTERY,
            lesson_stage: "done",
            completion_status: "complete",
          }
        : {
            mastery: 0,
            lesson_stage: "not_started",
            completion_status: "locked",
          },
    );
  }
  for (const nodeId of plan.completedNodeIds) {
    expect(
      built.node_states.find((state) => state.node_id === nodeId),
      `${nodeId} did not satisfy the target era's progression`,
    ).toMatchObject({
      mastery: GOLD_MASTERY,
      lesson_stage: "done",
      completion_status: "complete",
    });
  }
  expect((built.civic ?? []).map((placement) => placement.nodeId)).toEqual(
    plan.civicPlacements.map((placement) => placement.nodeId),
  );

  const firstLoad = await session.load();
  const firstBay = session.snapshot();
  await expect(buildPresenterEra(session, target.id)).resolves.toEqual(result);
  expect(await session.load()).toEqual(firstLoad);
  expect(session.snapshot()).toEqual(firstBay);
  session.dispose();
});

test("Presenter removal drops only visual placements and protects the Town Hall", async () => {
  setCityEraForPreview("atomic_age");
  const fixture = presenterFixtureFor({
    enabled: true,
    legacy: false,
    preset: "bronze-city",
    surface: "city",
    eraId: "atomic_age",
  });
  const session = createArchipelagoSession({
    initial: createCityDevSession(null, fixture.city.seed),
    standingEra: "atomic_age",
    stashed: fixture.archipelago.islands.filter((island) => island.eraId !== "atomic_age"),
    makeIsland: (snapshot) => createCityDevSession(snapshot),
    presenterMutationsEnabled: true,
  });
  const before = await session.load();
  const skillId = "LF.1";
  const civicId = before.civic?.[0]?.nodeId;
  if (!civicId) {
    throw new Error("The Presenter fixture has no civic placement to remove.");
  }
  const skillState = before.node_states.find((state) => state.node_id === skillId);

  await expect(session.removeBuildingForPresenter(skillId)).resolves.toEqual({
    nodeId: skillId,
    status: "removed",
    kind: "skill",
  });
  const afterSkill = await session.load();
  expect(afterSkill.placements?.some((placement) => placement.nodeId === skillId)).toBe(
    false,
  );
  expect(afterSkill.node_states.find((state) => state.node_id === skillId)).toMatchObject({
    node_id: skillState?.node_id,
    placement_estimate: skillState?.placement_estimate,
    mastery: skillState?.mastery,
    mastery_updated_at: skillState?.mastery_updated_at,
    completion_status: skillState?.completion_status,
    lesson_stage: skillState?.lesson_stage,
    last_practiced_at: skillState?.last_practiced_at,
  });

  await expect(session.removeBuildingForPresenter(civicId)).resolves.toEqual({
    nodeId: civicId,
    status: "removed",
    kind: "civic",
  });
  expect(
    (await session.load()).civic?.some((placement) => placement.nodeId === civicId),
  ).toBe(false);

  const beforeHallRefusal = await session.load();
  await expect(session.removeBuildingForPresenter(TOWN_HALL_ID)).resolves.toEqual({
    nodeId: TOWN_HALL_ID,
    status: "protected",
    kind: null,
  });
  expect(await session.load()).toEqual(beforeHallRefusal);
  session.dispose();
});

test("ordinary Bay sessions reject the presenter-only transaction without changing state", async () => {
  setCityEraForPreview("prehistoric");
  const session = createArchipelagoSession({
    initial: createCityDevSession(),
    standingEra: "prehistoric",
    makeIsland: (snapshot) => createCityDevSession(snapshot),
  });
  const before = session.snapshot();
  await expect(
    session.completeEraForPresenter(presenterEraBuildPlan("cyberpunk")),
  ).rejects.toThrow(/unavailable/i);
  await expect(session.removeBuildingForPresenter("NUM.S")).rejects.toThrow(/unavailable/i);
  expect(session.snapshot()).toEqual(before);
  expect(session.standing()).toBe("prehistoric");
  session.dispose();
});
