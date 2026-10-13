import { cityRosterNodeIds } from "@cr/game";
import { type RefObject, Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { afterEach, expect, test } from "vitest";
import { commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { resolveBuildingModel } from "../buildingAssets";
import { civicPlacementId } from "../civic";
import { civicOptionsForEra } from "../civicBuildings";
import { eraCityLayout } from "../islandLand";
import { resolveEraTownHall, TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../townHall";
import {
  defaultPlacements,
  footprintFor,
  rotationYFor,
  transformCenter,
} from "../worldLayout";
import { CityLighting } from "./CityLighting";
import { MODEL_STACK_NAME, PlacedBuilding } from "./PlacedBuilding";
import { StarterIsland } from "./StarterIsland";

const RECORD = Boolean(import.meta.env.VITE_INTEGRATION_CITY_COMPARISON);
const LABEL = String(import.meta.env.VITE_INTEGRATION_CITY_LABEL || "branch");
const ERA = "bronze_age" as const;
const VIEWPORT = { width: 1024, height: 580 } as const;

let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

function composition() {
  const civics = civicOptionsForEra(ERA).map((option, index) => ({
    nodeId: civicPlacementId(option.row.id, index),
    model: option.builtModel,
  }));
  const civicModels = new Map(civics.map((civic) => [civic.nodeId, civic.model]));
  const placements = defaultPlacements(
    [...civics.map((civic) => civic.nodeId), ...cityRosterNodeIds(ERA)],
    [{ nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM }],
    eraCityLayout(ERA).buildableRadius,
  ).map((placement) => ({
    ...placement,
    model:
      civicModels.get(placement.nodeId) ?? resolveBuildingModel(placement.nodeId, "built"),
  }));
  return {
    placements,
    hall: {
      nodeId: TOWN_HALL_ID,
      ...TOWN_HALL_CENTER_TRANSFORM,
      model: resolveEraTownHall(ERA, "prehistoric").model,
    },
  };
}

function CameraAim(): null {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function Metrics({
  targetRef,
  expectedIds,
}: {
  readonly targetRef: RefObject<HTMLElement | null>;
  readonly expectedIds: readonly string[];
}): null {
  const lastWrite = useRef(0);
  const revision = useRef(0);
  useFrame(({ gl, scene }) => {
    const now = performance.now();
    if (now - lastWrite.current < 250 || targetRef.current === null) {
      return;
    }
    lastWrite.current = now;
    revision.current += 1;
    const loaded: string[] = [];
    let modelMeshes = 0;
    for (const id of expectedIds) {
      const stack = scene
        .getObjectByName(`building-${id}`)
        ?.getObjectByName(MODEL_STACK_NAME);
      let meshes = 0;
      stack?.traverse((object) => {
        if ((object as THREE.Mesh).isMesh && object.visible) {
          meshes += 1;
        }
      });
      if (meshes > 0) {
        loaded.push(id);
        modelMeshes += meshes;
      }
    }
    let objects = 0;
    scene.traverse(() => {
      objects += 1;
    });
    const target = targetRef.current;
    target.dataset.revision = String(revision.current);
    target.dataset.loadedIds = loaded.sort().join(",");
    target.dataset.loadedModelMeshes = String(modelMeshes);
    target.dataset.drawCalls = String(gl.info.render.calls);
    target.dataset.triangles = String(gl.info.render.triangles);
    target.dataset.sceneObjects = String(objects);
  });
  return null;
}

function Host({ targetRef }: { readonly targetRef: RefObject<HTMLElement | null> }) {
  const { placements, hall } = composition();
  const expectedIds = [...placements.map((placement) => placement.nodeId), TOWN_HALL_ID];
  const layout = eraCityLayout(ERA);
  return (
    <div style={{ position: "fixed", inset: 0, ...VIEWPORT }}>
      <span
        ref={(node) => {
          targetRef.current = node;
        }}
        hidden
      />
      <Canvas
        shadows
        dpr={1}
        camera={{ position: [0, 82, 82], fov: 40, near: 1, far: 1200 }}
      >
        <CameraAim />
        <Metrics targetRef={targetRef} expectedIds={expectedIds} />
        <CityLighting islandRadius={layout.islandRadius} variant="day" />
        <StarterIsland layout={layout} reducedMotion eraId={ERA} />
        {placements.map((placement) => (
          <Suspense key={placement.nodeId} fallback={null}>
            <PlacedBuilding
              nodeId={placement.nodeId}
              center={transformCenter(placement, footprintFor(placement.nodeId))}
              rotationY={rotationYFor(placement.rot)}
              footprint={footprintFor(placement.nodeId)}
              model={placement.model}
              mastery={0}
              reducedMotion
              celebrateToken={0}
              onSelect={() => undefined}
            />
          </Suspense>
        ))}
        {hall.model !== null && (
          <Suspense fallback={null}>
            <PlacedBuilding
              nodeId={TOWN_HALL_ID}
              center={transformCenter(hall, footprintFor(TOWN_HALL_ID))}
              rotationY={rotationYFor(hall.rot)}
              footprint={footprintFor(TOWN_HALL_ID)}
              model={hall.model}
              mastery={0}
              reducedMotion
              celebrateToken={0}
              onSelect={() => undefined}
            />
          </Suspense>
        )}
      </Canvas>
    </div>
  );
}

test.runIf(RECORD)(
  "measures one exact fully loaded composition for integration comparison",
  async () => {
    await page.viewport(VIEWPORT.width, VIEWPORT.height);
    const targetRef: RefObject<HTMLElement | null> = { current: null };
    const expectedIds = [
      ...composition().placements.map((placement) => placement.nodeId),
      TOWN_HALL_ID,
    ].sort();
    harness = mount(<Host targetRef={targetRef} />);
    let previous = "";
    let previousRevision = -1;
    let stable = 0;
    await waitFor(
      () => {
        const target = targetRef.current;
        const nextRevision = Number(target?.dataset.revision ?? 0);
        if (nextRevision <= previousRevision) {
          return false;
        }
        previousRevision = nextRevision;
        const loaded = target?.dataset.loadedIds?.split(",").sort().join(",") ?? "";
        const signature = [
          loaded,
          target?.dataset.loadedModelMeshes ?? "0",
          target?.dataset.drawCalls ?? "0",
          target?.dataset.triangles ?? "0",
          target?.dataset.sceneObjects ?? "0",
        ].join(":");
        stable = signature === previous ? stable + 1 : 0;
        previous = signature;
        return loaded === expectedIds.join(",") && stable >= 8;
      },
      `${LABEL} never reached eight stable fully loaded composition samples`,
      120_000,
    );
    const target = targetRef.current as HTMLElement;
    const reading = {
      label: LABEL,
      integrationSha: import.meta.env.VITE_INTEGRATION_SHA || null,
      eraId: ERA,
      viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
      skillPlacements: cityRosterNodeIds(ERA).length,
      civicPlacements: 4,
      hallPlacements: 1,
      loadedModelIds: target.dataset.loadedIds?.split(",") ?? [],
      loadedModelMeshes: Number(target.dataset.loadedModelMeshes ?? 0),
      drawCalls: Number(target.dataset.drawCalls ?? 0),
      triangles: Number(target.dataset.triangles ?? 0),
      sceneObjects: Number(target.dataset.sceneObjects ?? 0),
    };
    expect(reading.loadedModelIds).toHaveLength(expectedIds.length);
    expect(reading.drawCalls).toBeGreaterThan(0);
    expect(reading.triangles).toBeGreaterThan(100_000);
    if (RECORD) {
      await commands.writeFile(
        `output/populated-city-comparison-${LABEL}.json`,
        `${JSON.stringify(reading, null, 2)}\n`,
        { encoding: "utf-8" },
      );
    }
  },
  180_000,
);
