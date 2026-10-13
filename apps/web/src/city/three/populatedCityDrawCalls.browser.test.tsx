import { cityRosterNodeIds } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import type { RefObject } from "react";
import { afterEach, expect, test } from "vitest";
import { commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { resolveBuildingModel } from "../buildingAssets";
import { civicPlacementId } from "../civic";
import { civicOptionsForEra } from "../civicBuildings";
import { eraCityLayout } from "../islandLand";
import { resolveEraTownHall, TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../townHall";
import { defaultPlacements } from "../worldLayout";
import type { OrbitControlsLike } from "./applyOrbit";
import CityScene, { type ScenePlacement, type SceneTownHall } from "./CityScene";

const VIEWPORT = { width: 1024, height: 580 } as const;

/**
 * Two established renderer readings, not the old five-digit city:
 *
 * - the one-context Atlas tops out at 1,230 calls while drawing all ten islands;
 * - the isolated authored terrain guard remains 120 calls.
 *
 * Twice the Atlas maximum is 2,460. Round that to 2,500: the 40-call remainder is one third
 * of an isolated terrain budget, while the fully loaded 54-building Cyberpunk sample reads
 * 2,308. Clean integration at `a6691e75` submits 14,439 for the exact 16-skill + 4-civic +
 * Hall Bronze composition; after solid-material batching this branch submits 992. The old
 * five-digit reading is therefore treated as the defect, not as precedent for this ceiling.
 */
const MAX_POPULATED_DRAW_CALLS = 2_500;
const REPRESENTATIVE_INDEXES = [
  2,
  Math.floor(ERA_SEQUENCE.length / 2),
  ERA_SEQUENCE.length - 1,
];
const REPRESENTATIVE_ERAS = REPRESENTATIVE_INDEXES.map(
  (index) => ERA_SEQUENCE[index]?.id,
).filter((eraId): eraId is EraId => eraId !== undefined);
const RECORD = Boolean(import.meta.env.VITE_POPULATED_CITY_PERF);
const FULL_COMPOSITION_TEST_TIMEOUT = 180_000;

let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

function populatedCity(eraId: EraId): readonly ScenePlacement[] {
  const eraIndex = ERA_SEQUENCE.findIndex((era) => era.id === eraId);
  const civicOptions =
    [...ERA_SEQUENCE]
      .slice(0, eraIndex + 1)
      .reverse()
      .map((era) => civicOptionsForEra(era.id))
      .find((options) => options.length === 4) ?? [];
  const civics = civicOptions.map((option, index) => ({
    nodeId: civicPlacementId(option.row.id, index),
    model: option.builtModel,
  }));
  const civicModelByPlacement = new Map(civics.map((civic) => [civic.nodeId, civic.model]));
  const placements = defaultPlacements(
    [...civics.map((civic) => civic.nodeId), ...cityRosterNodeIds(eraId)],
    [{ nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM }],
    eraCityLayout(eraId).buildableRadius,
  );
  return placements.map((placement) => ({
    ...placement,
    model:
      civicModelByPlacement.get(placement.nodeId) ??
      resolveBuildingModel(placement.nodeId, "built"),
    mastery: 0,
    celebrateToken: 0,
  }));
}

function hallFor(eraId: EraId): SceneTownHall {
  return {
    ...TOWN_HALL_CENTER_TRANSFORM,
    model: resolveEraTownHall(eraId, "prehistoric").model,
    celebrateToken: 0,
  };
}

function Host({
  eraId,
  placements,
  metricsRef,
}: {
  readonly eraId: EraId;
  readonly placements: readonly ScenePlacement[];
  readonly metricsRef: RefObject<HTMLElement | null>;
}) {
  const controlsRef: RefObject<OrbitControlsLike | null> = { current: null };
  return (
    <div className="city-shell" style={{ position: "fixed", inset: 0, ...VIEWPORT }}>
      <span
        ref={(node) => {
          metricsRef.current = node;
        }}
        hidden
      />
      <CityScene
        layout={eraCityLayout(eraId)}
        placed={placements}
        townHall={hallFor(eraId)}
        variant="day"
        reducedMotion
        controlsRef={controlsRef}
        metricsTargetRef={metricsRef}
        onSelect={() => undefined}
        eraId={eraId}
      />
    </div>
  );
}

interface Reading {
  readonly eraId: EraId;
  readonly populatedBuildings: number;
  readonly skillPlacements: number;
  readonly civicPlacements: number;
  readonly loadedModelMeshes: number;
  readonly loadedModelMeshesById: Readonly<Record<string, number>>;
  readonly islandRenderMeshes: number;
  readonly drawCalls: number;
  readonly triangles: number;
  readonly sceneObjects: number;
}

async function settledReading(eraId: EraId): Promise<Reading> {
  const placements = populatedCity(eraId);
  const metricsRef: RefObject<HTMLElement | null> = { current: null };
  harness?.cleanup();
  harness = mount(<Host eraId={eraId} placements={placements} metricsRef={metricsRef} />);
  const expectedIds = placements.map((placement) => placement.nodeId).sort();
  let previous = "";
  let previousRevision = -1;
  let stable = 0;
  await waitFor(
    () => {
      const target = metricsRef.current;
      const revision = Number(target?.dataset.metricsRevision ?? 0);
      if (revision <= previousRevision) {
        return false;
      }
      previousRevision = revision;
      const signature = [
        target?.dataset.drawCalls ?? "0",
        target?.dataset.triangles ?? "0",
        target?.dataset.sceneObjects ?? "0",
        target?.dataset.loadedModelMeshes ?? "0",
        target?.dataset.loadedModelMeshesById ?? "{}",
        target?.dataset.loadedPlacementIds ?? "",
      ].join(":");
      stable = signature === previous ? stable + 1 : 0;
      previous = signature;
      return (
        stable >= 8 &&
        target?.dataset.compositionReady === "true" &&
        target.dataset.hallLoaded === "true" &&
        Number(target.dataset.islandRenderMeshes ?? 0) > 10 &&
        Number(target.dataset.loadedPlacementCount ?? 0) === placements.length &&
        target.dataset.loadedPlacementIds?.split(",").sort().join(",") ===
          expectedIds.join(",")
      );
    },
    `${eraId} never reached eight stable, fully composed renderer samples`,
    120_000,
  );
  const target = metricsRef.current as HTMLElement;
  return {
    eraId,
    populatedBuildings: placements.length,
    skillPlacements: Number(target.dataset.expectedSkillPlacementCount ?? 0),
    civicPlacements: Number(target.dataset.expectedCivicPlacementCount ?? 0),
    loadedModelMeshes: Number(target.dataset.loadedModelMeshes ?? 0),
    loadedModelMeshesById: JSON.parse(
      target.dataset.loadedModelMeshesById ?? "{}",
    ) as Record<string, number>,
    islandRenderMeshes: Number(target.dataset.islandRenderMeshes ?? 0),
    drawCalls: Number(target.dataset.drawCalls ?? 0),
    triangles: Number(target.dataset.triangles ?? 0),
    sceneObjects: Number(target.dataset.sceneObjects ?? 0),
  };
}

// CI loads 36 distinct skill/civic GLBs under shared browser contention; the outer timeout
// therefore matches the composition wait instead of Vitest's unrelated 15-second default.
test(
  "publishes the actual fully loaded placement identities before measuring",
  async () => {
    await page.viewport(VIEWPORT.width, VIEWPORT.height);
    const eraId = "renaissance";
    const placements = populatedCity(eraId);
    const metricsRef: RefObject<HTMLElement | null> = { current: null };
    harness = mount(<Host eraId={eraId} placements={placements} metricsRef={metricsRef} />);
    await waitFor(
      () => metricsRef.current?.dataset.compositionReady === "true",
      "the composition probe never reached its fully loaded population",
      120_000,
    );
    const target = metricsRef.current as HTMLElement;
    expect(target.dataset.expectedPlacementCount).toBe(String(placements.length));
    expect(target.dataset.expectedCivicPlacementCount).toBe("4");
    expect(Number(target.dataset.expectedSkillPlacementCount ?? 0)).toBe(
      placements.length - 4,
    );
    expect(target.dataset.loadedPlacementCount).toBe(String(placements.length));
    expect(target.dataset.loadedPlacementIds?.split(",").sort()).toEqual(
      placements.map((placement) => placement.nodeId).sort(),
    );
    expect(Number(target.dataset.loadedModelMeshes ?? 0)).toBeGreaterThan(
      placements.length,
    );
    expect(target.dataset.hallLoaded).toBe("true");
    expect(Number(target.dataset.islandRenderMeshes ?? 0)).toBeGreaterThan(10);
    expect(target.dataset.compositionReady).toBe("true");
  },
  FULL_COMPOSITION_TEST_TIMEOUT,
);

test("rejects a rendered scene whose delayed half has no model meshes", async () => {
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
  const eraId = "renaissance";
  const complete = populatedCity(eraId);
  const delayed = complete.map((placement, index) =>
    index < Math.ceil(complete.length / 2) ? placement : { ...placement, model: null },
  );
  const metricsRef: RefObject<HTMLElement | null> = { current: null };
  harness = mount(<Host eraId={eraId} placements={delayed} metricsRef={metricsRef} />);
  await waitFor(
    () => Number(metricsRef.current?.dataset.metricsRevision ?? 0) >= 2,
    "the delayed-composition probe never received a rendered frame",
    40_000,
  );
  const target = metricsRef.current as HTMLElement;
  expect(target.dataset.expectedPlacementCount).toBe(String(delayed.length));
  expect(Number(target.dataset.loadedPlacementCount ?? delayed.length)).toBeLessThan(
    delayed.length,
  );
  expect(target.dataset.compositionReady).toBe("false");
}, 120_000);

test("representative populated cities stay inside the real WebGL draw-call budget", async () => {
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
  expect(ERA_SEQUENCE).toHaveLength(10);
  expect(REPRESENTATIVE_ERAS).toEqual(["bronze_age", "renaissance", "cyberpunk"]);
  const readings: Reading[] = [];
  for (const eraId of REPRESENTATIVE_ERAS) {
    const reading = await settledReading(eraId);
    expect(reading.populatedBuildings, `${eraId} populated floor`).toBeGreaterThanOrEqual(
      16,
    );
    expect(reading.civicPlacements, `${eraId} civic composition`).toBe(4);
    expect(reading.skillPlacements, `${eraId} skill composition`).toBe(
      reading.populatedBuildings - 4,
    );
    expect(reading.loadedModelMeshes, `${eraId} loaded model mesh floor`).toBeGreaterThan(
      reading.populatedBuildings * 2,
    );
    expect(reading.islandRenderMeshes, `${eraId} island render mesh floor`).toBeGreaterThan(
      10,
    );
    expect(reading.drawCalls, `${eraId} real draw-call floor`).toBeGreaterThan(
      reading.islandRenderMeshes,
    );
    expect(reading.triangles, `${eraId} triangle floor`).toBeGreaterThan(100_000);
    expect(reading.sceneObjects, `${eraId} scene-object floor`).toBeGreaterThan(
      reading.populatedBuildings * 3,
    );
    expect(
      reading.drawCalls,
      `${eraId} submits ${reading.drawCalls} calls for ${reading.populatedBuildings} buildings`,
    ).toBeLessThanOrEqual(MAX_POPULATED_DRAW_CALLS);
    readings.push(reading);
  }
  expect(readings).toHaveLength(REPRESENTATIVE_ERAS.length);
  if (RECORD) {
    if (RECORD) {
      await commands.writeFile(
        "output/design-review/evan-islands/populated-city-performance.json",
        `${JSON.stringify(
          {
            viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
            maximumDrawCalls: MAX_POPULATED_DRAW_CALLS,
            readings,
          },
          null,
          2,
        )}\n`,
        { encoding: "utf-8" },
      );
    }
  }
}, 240_000);
