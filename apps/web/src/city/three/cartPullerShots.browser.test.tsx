import { type CitizenNodeInput, deriveCitizenRoster } from "@cr/game";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { resolveBuildingModel } from "../buildingAssets";
import { CURRENT_ERA_ID } from "../eraDressing";
import { vehicleForEra } from "../eraVehicles";
import type { RoadCell } from "../roads";
import { resolveTownHallModel, TOWN_HALL_ID } from "../townHall";
import { planVehicles, vehiclePose } from "../vehicleRoutes";
import {
  BUILDABLE_RADIUS,
  computeCityLayout,
  defaultPlacements,
  footprintCells,
  footprintFor,
  ISLAND_GRASS_RADIUS,
  type PlacedTransform,
  rotationYFor,
  transformCenter,
} from "../worldLayout";
import { Citizens } from "./Citizens";
import { CityLighting, cityEnvironment } from "./CityLighting";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { PlacedBuilding } from "./PlacedBuilding";
import { Roads } from "./Roads";
import { StarterIsland } from "./StarterIsland";
import { TownHall } from "./TownHall";
import { Vehicles } from "./Vehicles";

/**
 * **THE CART-PULLER AND AN ORDINARY CITIZEN, IN ONE FRAME.**
 *
 * The team lead's report is a judgement about a rendered picture — *"the person pulling the
 * cart in era 1 doesnt actually look like the other people it looks corrupted"* — and
 * `personFigureShared.test.ts` cannot answer it. That file proves the hauler is built from
 * the crowd's own vertex buffers and stands on the road, which is exactly the kind of true
 * measurement `.cursor/rules/qa-verification.mdc` warns is not the evidence a visual claim
 * owes. *Does it read as one of the people* is a question about a frame.
 *
 * ## BOTH THINGS ARE IN EVERY FRAME, WHICH IS THE WHOLE POINT
 *
 * A crop of the sled would be a picture of the one thing nobody doubted. The claim is a
 * COMPARISON, so each shot is framed to hold the hauler AND the settlement's own people at
 * the same time, at the same camera, so a reviewer can put the two figures side by side
 * rather than remember one of them.
 *
 * ## THE VIEWPORT IS 1024x580, AND UNDER REDUCED MOTION
 *
 * The lead's own short window, per this repository's QA rule, and the one §4.1 measures the
 * traffic against: the same sled is 5.64 px/u at full zoom-out on a 580px-tall viewport
 * against 8.75 on a 1400x900 one. Reduced motion holds both the sled and the crowd at their
 * `t = 0` poses, so two runs photograph the same frame — and the crowd's own resting pose is
 * what a learner with the preference set actually sees.
 *
 * ## OFF BY DEFAULT
 *
 * `VITE_CART_SHOTS=1 npm run test:browser` regenerates the pair. Same gate and the same
 * measured reason as `citizensInTheWinterShots.browser.test.tsx` and
 * `vehicleOnTheRoad.browser.test.tsx`: a heavy shadow-mapped GLB scene with screenshot
 * round-trips does not fail here, it starves an animation-timing assertion in some other
 * file of frames, and that failure is indistinguishable from a real regression.
 */

const ENABLED = Boolean(import.meta.env.VITE_CART_SHOTS);

/** The lead's window. Short, which is the screen this is judged on. */
const HIS_WINDOW = { width: 1024, height: 580 } as const;

// Named rather than defaulted: the radius argument became required so that no measurement
// gets era one's island by omission. This scene draws era one's, and says so with the same
// constant its camera far-plane and lighting below already use.
const LAYOUT = computeCityLayout(ISLAND_GRASS_RADIUS);
const SKILL_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.5", "NUM.4"] as const;
const ROLES: Readonly<Record<string, CitizenNodeInput["citizen_role"]>> = {
  "NUM.2": "residence",
  "NUM.3": "school",
};
const HUB: PlacedTransform = { nodeId: TOWN_HALL_ID, col: -1, row: -1, rot: 0 };
const CITY = defaultPlacements([...SKILL_NODES], [HUB], BUILDABLE_RADIUS);
const ROSTER = deriveCitizenRoster({
  nodes: SKILL_NODES.map((nodeId) => ({
    node_id: nodeId,
    citizen_role: ROLES[nodeId] ?? "civic",
    placed: true,
    mastery: 2,
    lesson_stage: "done" as const,
    placement_estimate: 0 as const,
  })),
  seed: 0x570e,
});

/**
 * A five-tile straight along the settlement's southern edge.
 *
 * **Derived against the buildings rather than written down**: the row is asserted free of
 * every footprint below, so a re-pack of `defaultPlacements` that moved a building onto this
 * run fails here instead of photographing a road through a wall. South rather than north
 * because the camera looks down +Z at the shipped ~49-degree tilt, so ground south of the
 * target is the ground that stays in frame — the lesson
 * `citizensInTheWinterShots.browser.test.tsx` paid for.
 */
const ROADS: readonly RoadCell[] = [-2, -1, 0, 1, 2].map((col) => ({ col, row: 3 }));

function occupiedCells(): Set<string> {
  const cells = new Set<string>();
  for (const placed of [...CITY, HUB]) {
    for (const key of footprintCells(placed, footprintFor(placed.nodeId))) {
      cells.add(key);
    }
  }
  return cells;
}

/** Where the sled is seated under reduced motion, which is what the camera is aimed at. */
function sledAtRest(): { x: number; z: number } {
  const plan = planVehicles(ROADS, vehicleForEra(CURRENT_ERA_ID))[0];
  if (plan === undefined) {
    throw new Error("the road fixture stopped buying a vehicle");
  }
  const pose = vehiclePose(plan, 0);
  return { x: pose.x, z: pose.z };
}

/**
 * The Dwellings' doorstep, which is where the crowd this comparison needs actually stands:
 * `NUM.2` carries 26 of the island's 44 homes, and under reduced motion every citizen is
 * posed at the resting end of their beat, which is their own door. Derived from the placed
 * building rather than written down, so a re-pack moves the camera with it.
 */
const DWELLINGS_DOOR = (() => {
  const placed = CITY.find((p) => p.nodeId === "NUM.2");
  if (!placed) {
    throw new Error("the Dwellings are not on this island, so there is no crowd to aim at");
  }
  const centre = transformCenter(placed, footprintFor("NUM.2"));
  return { x: centre.x, z: centre.z + 2 };
})();

interface Shot {
  readonly name: string;
  /** Camera distance as a share of the default framing. */
  readonly zoom: number;
  /** Where on the ground the camera looks, `sled` being the sled's reduced-motion pose. */
  readonly at: "sled" | "between";
}

/**
 * Two frames, because they answer different questions. The close one is where the FIGURE is
 * judgeable at all. The second is aimed between the sled and the Dwellings' doorstep, which
 * is where the comparison lives: the hauler and the island's largest resident crowd, in one
 * picture, at one camera, at the same size. A crop of the sled alone would be a picture of
 * the one thing nobody doubted.
 */
const SHOTS: readonly Shot[] = [
  { name: "01-cart-puller-close-1024x580", zoom: 0.26, at: "sled" },
  { name: "02-cart-puller-beside-the-crowd-1024x580", zoom: 0.34, at: "between" },
];

test("the road runs on free ground, and the set holds a close look and a comparison", () => {
  const occupied = occupiedCells();
  for (const cell of ROADS) {
    expect(
      occupied.has(`${cell.col},${cell.row}`),
      `the road fixture runs through a building at (${cell.col}, ${cell.row})`,
    ).toBe(false);
  }
  // The floor: an empty road fixture would satisfy the loop above.
  expect(ROADS.length).toBeGreaterThanOrEqual(4);
  // ...and it buys a vehicle, so there is a cart-puller in the frame at all.
  expect(planVehicles(ROADS, vehicleForEra(CURRENT_ERA_ID)).length).toBeGreaterThan(0);

  expect(SHOTS.length).toBeGreaterThanOrEqual(2);
  expect(SHOTS.some((shot) => shot.zoom <= 0.3)).toBe(true);
  // At least one frame is aimed at the ground BETWEEN the two figures being compared, which
  // is the property that makes the set a comparison rather than two portraits.
  expect(SHOTS.some((shot) => shot.at === "between")).toBe(true);
  // ...and the two subjects really are near enough each other for one frame to hold both.
  // Measured off the fixture rather than asserted about the camera: the sled's resting pose
  // and the Dwellings' doorstep are a few units apart on this island.
  const rest = sledAtRest();
  expect(Math.hypot(rest.x - DWELLINGS_DOOR.x, rest.z - DWELLINGS_DOOR.z)).toBeLessThan(8);
  expect(HIS_WINDOW).toEqual({ width: 1024, height: 580 });
});

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  if (!ENABLED) {
    return;
  }
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

function cameraAt(distance: number): [number, number, number] {
  const azimuth = -Math.PI * 0.28;
  const polar = VILLAGE_CAMERA.polarAngle;
  return [
    Math.sin(polar) * Math.sin(azimuth) * distance,
    Math.cos(polar) * distance + 2,
    Math.sin(polar) * Math.cos(azimuth) * distance,
  ];
}

test.runIf(ENABLED).each(SHOTS)("photographs the cart-puller: %s", async (shot) => {
  const rest = sledAtRest();
  const at =
    shot.at === "sled"
      ? rest
      : {
          x: (rest.x + DWELLINGS_DOOR.x) / 2,
          z: (rest.z + DWELLINGS_DOOR.z) / 2,
        };
  const env = cityEnvironment("day", false);
  const offset = cameraAt(LAYOUT.cameraDistance * shot.zoom);
  let gl: THREE.WebGLRenderer | null = null;
  await page.viewport(HIS_WINDOW.width, HIS_WINDOW.height);

  h = mount(
    <div style={{ width: HIS_WINDOW.width, height: HIS_WINDOW.height }}>
      <Canvas
        shadows
        dpr={1}
        camera={{
          position: [offset[0] + at.x, offset[1], offset[2] + at.z],
          fov: 32,
          near: VILLAGE_CAMERA.nearPlane,
          far: ISLAND_GRASS_RADIUS * VILLAGE_CAMERA.farPlaneRatio,
        }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          state.gl.toneMapping = THREE.ACESFilmicToneMapping;
          state.gl.toneMappingExposure = 1;
          state.camera.lookAt(at.x, 1, at.z);
          gl = state.gl;
        }}
      >
        <color attach="background" args={[env.background]} />
        <CityLighting islandRadius={ISLAND_GRASS_RADIUS} variant="day" winter={false} />
        <StarterIsland layout={LAYOUT} reducedMotion eraId={CURRENT_ERA_ID} />
        <Roads roads={ROADS} eraId={CURRENT_ERA_ID} />
        <Vehicles roads={ROADS} eraId={CURRENT_ERA_ID} reducedMotion />
        {CITY.map((p) => {
          const model = resolveBuildingModel(p.nodeId, "built");
          return model ? (
            <PlacedBuilding
              key={p.nodeId}
              nodeId={p.nodeId}
              center={transformCenter(p, footprintFor(p.nodeId))}
              rotationY={rotationYFor(p.rot)}
              footprint={footprintFor(p.nodeId)}
              model={model}
              mastery={2}
              reducedMotion
              celebrateToken={0}
              winter={false}
              onSelect={() => undefined}
            />
          ) : null;
        })}
        <TownHall
          center={transformCenter(HUB, footprintFor(TOWN_HALL_ID))}
          rotationY={rotationYFor(HUB.rot)}
          footprint={footprintFor(TOWN_HALL_ID)}
          model={resolveTownHallModel("built")}
          reducedMotion
          celebrateToken={0}
          winter={false}
          onSelect={() => undefined}
        />
        <Citizens
          roster={ROSTER}
          placements={CITY}
          hub={HUB}
          seed={0x570e}
          eraId={CURRENT_ERA_ID}
          reducedMotion
        />
      </Canvas>
    </div>,
  );

  await waitFor(() => gl !== null, "the canvas never created", 20000);
  const renderer = gl as unknown as THREE.WebGLRenderer;
  await waitFor(
    () => renderer.info.render.triangles > 40000,
    "the settlement never finished loading",
    30000,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 500));

  if (ENABLED) {
    const written = await page.screenshot({
      path: `__screenshots__/cart/${shot.name}.png`,
    });
    expect(written, `no screenshot was written for ${shot.name}`).toBeTruthy();
  }
  expect(renderer.info.render.triangles, shot.name).toBeGreaterThan(40000);
});
