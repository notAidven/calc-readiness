import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { afterAll, afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { CURRENT_ERA_ID } from "../eraDressing";
import { vehicleForEra } from "../eraVehicles";
import { eraCityLayout } from "../islandLand";
import { type RoadCell, roadCellKey } from "../roads";
import { framedTestBudget } from "../shotBudget";
import { cellUnder, planVehicles, vehiclePose } from "../vehicleRoutes";
import { ISLAND_GRASS_RADIUS } from "../worldLayout";
import { CityLighting, cityEnvironment } from "./CityLighting";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { Roads } from "./Roads";
import { StarterIsland } from "./StarterIsland";
import { VEHICLE_OBJECT_NAME, Vehicles } from "./Vehicles";

/**
 * **A SLED ON A ROAD, ON A REAL GPU, AT THE SCREEN THIS IS REVIEWED ON.**
 *
 * `vehicleRoutes.test.ts` proves the arithmetic and `Vehicles.test.ts` proves the object.
 * Neither can answer the two questions only a live context can:
 *
 *  1. **Is it in the scene, and is it over a laid road tile?** *"A cart that never appears
 *     on a road, or appears where there is no road, is a failure however cheap."* The
 *     position is read off the mounted scene graph and turned back into a grid cell, so this
 *     is a measurement of the rendered object and not of the plan that produced it.
 *  2. **Does reduced motion HOLD it rather than remove it?** R5, and the house rule
 *     `crises/README.md:213-216` states for every animation in the renderer. Both halves are
 *     asserted in one run: still under the preference, moving without it.
 *
 * ## THE VIEWPORT IS NAMED BECAUSE IT IS HALF THE EVIDENCE
 *
 * **1024x580**, the short window this repository's QA rule requires spatial claims to be
 * taken at. §4.1 measures why it governs here: the same object is 5.64 px/u at full
 * zoom-out on a 580px-tall viewport against 8.75 on a 1400x900 one, so a comfortable
 * developer window makes everything 55% bigger than the screen the work is judged on.
 *
 * ## AND THE FRAME IS DETERMINISTIC UNDER REDUCED MOTION, WHICH IS MEASURED HERE
 *
 * Frame captures on this surface are unstable — the island's gulls run on the render clock
 * and produce whole-frame noise — and `reducedMotion` is what takes the comparison to zero
 * differing pixels. Traffic is one more thing on the frame loop, so the question *"do the
 * vehicles have to stand down for frame work as well"* is answered by measurement rather
 * than by argument: two captures of a scene WITH vehicles in it, under reduced motion, are
 * compared pixel for pixel.
 */

const SHORT = { width: 1024, height: 580 } as const;
const LAYOUT = eraCityLayout("prehistoric");

/**
 * A four-tile straight and a longer L, disconnected from each other, so the run the vehicle
 * takes has a corner in it and the frame has more than one road in it. Kept near the island
 * centre so one camera holds the whole network.
 */
const ROADS: readonly RoadCell[] = [
  { col: -3, row: 0 },
  { col: -2, row: 0 },
  { col: -1, row: 0 },
  { col: 0, row: 0 },
  { col: 1, row: 0 },
  { col: 2, row: 0 },
  { col: 2, row: 1 },
  { col: 2, row: 2 },
];

const LAID = new Set(ROADS.map((cell) => roadCellKey(cell.col, cell.row)));

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

interface Mounted {
  scene: THREE.Scene;
  gl: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
}

/**
 * The two frames the photograph set holds, and the reason it is two.
 *
 * The **wide** one is at the game's own default camera distance, which is the distance a
 * learner actually plays at, and it answers whether a 2.65u sled reads on the island at all.
 * The **close** one is at the dolly's own zoom-in limit and answers what the object looks
 * like. Neither substitutes for the other, and a crop of the sled alone would be a picture
 * of the one thing nobody doubts, so even the close frame is framed to hold the road and the
 * ground around it.
 */
const SHOTS = [
  {
    name: "01-traffic-on-the-island-1024x580",
    distance: LAYOUT.cameraDistance,
    target: [0, 0, 0] as const,
  },
  {
    name: "02-the-sled-close-1024x580",
    distance: LAYOUT.cameraDistance * VILLAGE_CAMERA.minDistanceRatio,
    target: [-4, 0, 4] as const,
  },
] as const;

interface MountOptions {
  readonly shot?: (typeof SHOTS)[number];
  readonly winter?: boolean;
  /**
   * Mount the ISLAND behind the roads.
   *
   * **Off by default, and that is a measured precaution rather than a shortcut.** Nothing
   * about *"is the sled on the road"* needs the island, and `winterCrisisShots`'s header
   * records what a heavy browser file does here: *"Left enabled it does not fail — it makes
   * something ELSE fail"*, in a different file each run, always an animation-timing
   * assertion starved of frames. This file saw exactly that once over two full-suite runs
   * (`lessons/labelFigureNarrow.browser.test.tsx`, measuring a card mid-pop at 0.86 of its
   * final width) and then went green, so the island is mounted only where it is the subject:
   * the frame-determinism case, whose whole point is the gulls, and the photographs, which
   * CI does not take.
   */
  readonly island?: boolean;
}

async function mountCity(
  reducedMotion: boolean,
  { shot = SHOTS[0], winter = false, island = false }: MountOptions = {},
): Promise<Mounted> {
  restore ??= { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(SHORT.width, SHORT.height);
  const env = cityEnvironment("day", false);
  let scene: THREE.Scene | null = null;
  let gl: THREE.WebGLRenderer | null = null;
  const [tx, ty, tz] = shot.target;
  const azimuth = -Math.PI * 0.28;
  const polar = VILLAGE_CAMERA.polarAngle;

  h = mount(
    <div style={{ width: SHORT.width, height: SHORT.height }}>
      <Canvas
        dpr={1}
        camera={{
          position: [
            tx + Math.sin(polar) * Math.sin(azimuth) * shot.distance,
            ty + Math.cos(polar) * shot.distance + 2,
            tz + Math.sin(polar) * Math.cos(azimuth) * shot.distance,
          ],
          fov: 32,
          near: VILLAGE_CAMERA.nearPlane,
          far: ISLAND_GRASS_RADIUS * VILLAGE_CAMERA.farPlaneRatio,
        }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          state.camera.lookAt(tx, ty, tz);
          scene = state.scene;
          gl = state.gl;
        }}
      >
        <color attach="background" args={[env.background]} />
        <CityLighting islandRadius={ISLAND_GRASS_RADIUS} variant="day" winter={false} />
        {island && <StarterIsland layout={LAYOUT} reducedMotion eraId={CURRENT_ERA_ID} />}
        <Roads roads={ROADS} eraId={CURRENT_ERA_ID} />
        <Vehicles
          roads={ROADS}
          eraId={CURRENT_ERA_ID}
          reducedMotion={reducedMotion}
          winter={winter}
        />
      </Canvas>
    </div>,
  );

  await waitFor(() => scene !== null && gl !== null, "the canvas never created", 20000);
  const ready = gl as unknown as THREE.WebGLRenderer;
  // The renderer has SUBMITTED geometry, so nothing below reads a scene that never drew. The
  // floor moves with the fixture: the island is thousands of triangles, and eight road tiles
  // plus a sled are hundreds.
  const floor = island ? 5000 : 200;
  await waitFor(
    () => ready.info.render.triangles > floor,
    `the scene never drew ${floor} triangles`,
    20000,
  );
  return {
    scene: scene as unknown as THREE.Scene,
    gl: ready,
    canvas: ready.domElement,
  };
}

function vehicleRoots(scene: THREE.Object3D): THREE.Object3D[] {
  const found: THREE.Object3D[] = [];
  scene.traverse((node) => {
    if (node.name === VEHICLE_OBJECT_NAME) {
      found.push(node);
    }
  });
  return found;
}

/** Where a vehicle root actually is in world space, straight off the mounted scene. */
function worldCellOf(root: THREE.Object3D): RoadCell {
  root.updateWorldMatrix(true, false);
  const at = new THREE.Vector3().setFromMatrixPosition(root.matrixWorld);
  return cellUnder({ x: at.x, z: at.z, headingY: 0, distance: 0 });
}

/**
 * How far a rendered position is from the run's own polyline of cell centres.
 *
 * **This is deliberately computed from the PATH and not from `vehiclePose`**, so it is an
 * independent check rather than a tautology. Asserting the render equals what `vehiclePose`
 * returns cannot catch a `vehiclePose` that moved the vehicle off the road, because both
 * sides of the comparison move together — measured: injecting a one-cell lateral drift into
 * the pose leaves such an assertion green.
 */
function distanceToRun(
  path: readonly { x: number; z: number }[],
  at: THREE.Vector3,
): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1] as { x: number; z: number };
    const b = path[i] as { x: number; z: number };
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz;
    const t =
      lengthSq === 0
        ? 0
        : Math.min(1, Math.max(0, ((at.x - a.x) * dx + (at.z - a.z) * dz) / lengthSq));
    best = Math.min(best, Math.hypot(at.x - (a.x + dx * t), at.z - (a.z + dz * t)));
  }
  return best;
}

function worldPositionOf(root: THREE.Object3D): THREE.Vector3 {
  root.updateWorldMatrix(true, false);
  return new THREE.Vector3().setFromMatrixPosition(root.matrixWorld);
}

function meshCount(root: THREE.Object3D): number {
  let meshes = 0;
  root.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      meshes += 1;
    }
  });
  return meshes;
}

function capture(canvas: HTMLCanvasElement): Uint8ClampedArray {
  const sink = document.createElement("canvas");
  sink.width = canvas.width;
  sink.height = canvas.height;
  const ctx = sink.getContext("2d");
  if (!ctx) {
    throw new Error("no 2D context to sample the frame with");
  }
  ctx.drawImage(canvas, 0, 0);
  return ctx.getImageData(0, 0, sink.width, sink.height).data;
}

function differingPixels(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  expect(a.length).toBe(b.length);
  let differing = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) {
      differing += 1;
    }
  }
  return differing;
}

const settle = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

test("a vehicle is mounted, is drawn, and stands over a laid road tile", {
  timeout: framedTestBudget(1),
}, async () => {
  // What the plan says, so the scene can be measured against it rather than against a
  // number written here.
  const plans = planVehicles(ROADS, vehicleForEra(CURRENT_ERA_ID));
  expect(plans.length, "the fixture has to buy at least one vehicle").toBeGreaterThan(0);

  const { scene, gl } = await mountCity(false);
  const roots = vehicleRoots(scene);
  expect(roots).toHaveLength(plans.length);
  // Drawn, not merely attached: a group R3F never mounted has no meshes under it.
  expect(meshCount(roots[0] as THREE.Object3D)).toBeGreaterThanOrEqual(8);
  expect(gl.info.render.triangles).toBeGreaterThan(200);

  // THE SPATIAL CLAIM, measured off the live scene graph over several frames, in two
  // independent ways: the cell under the sled carries a road, AND the sled is on the run's
  // own line of cell centres. The second is what catches a pose that walks a road-shaped
  // path parallel to the road, which the first cannot: shifting a vehicle one cell along a
  // road that is six cells long leaves it on a road cell almost everywhere.
  let reads = 0;
  for (let i = 0; i < 12; i += 1) {
    await settle(120);
    for (const root of vehicleRoots(scene)) {
      const cell = worldCellOf(root);
      expect(
        LAID.has(roadCellKey(cell.col, cell.row)),
        `a vehicle stood on (${cell.col}, ${cell.row}), which carries no road`,
      ).toBe(true);
      const off = Math.min(
        ...plans.map((candidate) => distanceToRun(candidate.path, worldPositionOf(root))),
      );
      expect(
        off,
        "the rendered sled is off its own run's line of cell centres",
      ).toBeLessThan(0.001);
      reads += 1;
    }
  }
  // The floor: "every read was on the road" is satisfied by reading nothing.
  expect(reads).toBeGreaterThanOrEqual(12);
});

test("it MOVES on the frame loop, so the id changing is not the only thing that happens", {
  timeout: framedTestBudget(1),
}, async () => {
  const { scene } = await mountCity(false);
  const root = vehicleRoots(scene)[0] as THREE.Object3D;
  const start = root.position.clone();
  await settle(900);
  const moved = root.position.distanceTo(start);
  // At 1.1 u/s a sled covers about a unit a second, so ~0.9u in 900ms. A tenth of that is a
  // generous floor for a starved frame loop and still miles from zero.
  expect(moved, "the vehicle never moved").toBeGreaterThan(0.09);
});

test("reduced motion HOLDS a posed still frame rather than removing the vehicle", {
  timeout: framedTestBudget(1),
}, async () => {
  // THE ISLAND IS MOUNTED HERE and nowhere else in CI, because the gulls are the whole
  // subject: they are the documented source of whole-frame noise on this surface, so a
  // determinism claim taken over a scene without them would be measuring nothing.
  const { scene, canvas } = await mountCity(true, { island: true });
  const roots = vehicleRoots(scene);
  // Present. R5: *"a stationary drone in the air is a photograph of a flying drone, which is
  // correct; a missing drone is a hole in the picture."*
  expect(roots.length, "reduced motion must not delete the traffic").toBeGreaterThan(0);
  expect(meshCount(roots[0] as THREE.Object3D)).toBeGreaterThanOrEqual(8);

  const root = roots[0] as THREE.Object3D;
  const seated = root.position.clone();
  // And it is seated at the pose the plan gives for `t = 0`, not at the origin.
  const plan = planVehicles(ROADS, vehicleForEra(CURRENT_ERA_ID))[0];
  if (plan === undefined) {
    throw new Error("the fixture stopped buying a vehicle");
  }
  const expected = vehiclePose(plan, 0);
  expect(seated.x).toBeCloseTo(expected.x, 4);
  expect(seated.z).toBeCloseTo(expected.z, 4);
  // ...and, independently of `vehiclePose`, it is on the run's own line of cell centres.
  expect(distanceToRun(plan.path, seated)).toBeLessThan(0.001);

  await settle(900);
  expect(root.position.distanceTo(seated), "it moved under reduced motion").toBe(0);

  // AND THE WHOLE FRAME IS STILL, which is the question this file exists to answer for the
  // frame-capture work: traffic on the frame loop does NOT have to stand down for a
  // deterministic capture, because R5's posed still frame already makes it deterministic.
  const first = capture(canvas);
  await settle(700);
  const second = capture(canvas);
  expect(
    differingPixels(first, second),
    "two captures of a reduced-motion scene WITH vehicles in it must be identical",
  ).toBe(0);
});

test("stands down on a crisis board, where the snow course buries the road", {
  timeout: framedTestBudget(2),
}, async () => {
  // The winter lays its snow ABOVE the road stack, so a vehicle riding the road's top face
  // would be under a drift. Removal rather than a still frame, which is the one place this
  // differs from reduced motion.
  const winterBoard = await mountCity(true, { winter: true });
  expect(vehicleRoots(winterBoard.scene)).toHaveLength(0);
  winterBoard.gl.dispose();
  h?.cleanup();
  h = null;

  // THE POSITIVE CONTROL, in the same run: everything else identical, winter off, and the
  // traffic is there. Without it "no vehicles" is satisfied by a layer that never mounts.
  const fairWeather = await mountCity(true, { winter: false });
  expect(vehicleRoots(fairWeather.scene).length).toBeGreaterThan(0);
});

/**
 * **THE PHOTOGRAPHS ARE OFF BY DEFAULT.** Run
 * `VITE_VEHICLE_SHOTS=1 npm run test:browser` to regenerate the pair.
 *
 * Same ruling and the same reason as `winterCrisisShots.browser.test.tsx`: two island scenes
 * with two screenshot round-trips do not fail, they make an animation-timing assertion in
 * some OTHER file fail by starving it of frames, and that failure is indistinguishable from a
 * real regression to whoever reads it next. They land in `__screenshots__/`, which is
 * gitignored, because they are evidence for a review and not a fixture.
 */
const SHOTS_ENABLED = Boolean(import.meta.env.VITE_VEHICLE_SHOTS);

test.runIf(SHOTS_ENABLED).each(SHOTS)(
  "photographs the traffic at 1024x580, with the road around it: $name",
  { timeout: framedTestBudget(1) },
  async (shot) => {
    // Taken under REDUCED MOTION, so the sled is at the pose `t = 0` seats it at and two
    // runs of this file photograph the same frame. A shot of a moving object is a shot of
    // wherever the frame loop happened to be.
    const { scene, gl } = await mountCity(true, { shot, island: true });
    expect(vehicleRoots(scene).length).toBeGreaterThan(0);
    await settle(400);
    if (SHOTS_ENABLED) {
      const written = await page.screenshot({
        path: `__screenshots__/vehicles/${shot.name}.png`,
      });
      expect(written, `no screenshot was written for ${shot.name}`).toBeTruthy();
    }
    // It photographed a scene rather than a torn-down canvas.
    expect(gl.info.render.triangles, shot.name).toBeGreaterThan(5000);
  },
);

test("the photograph set holds the distance a learner plays at AND a close look", () => {
  // A set shot only at one distance answers only one of the two questions (§4.1: the same
  // object is 5.64 px/u at full zoom-out and 29.31 at full zoom-in on this viewport), so the
  // set's own shape is asserted rather than left to whoever adds the next shot.
  expect(SHOTS.length).toBeGreaterThanOrEqual(2);
  expect(SHOTS.some((shot) => shot.distance === LAYOUT.cameraDistance)).toBe(true);
  expect(
    SHOTS.some((shot) => shot.distance <= LAYOUT.cameraDistance * 0.6),
    "one shot has to be close enough to judge the object itself",
  ).toBe(true);
  expect(SHORT.height).toBeLessThan(700);
});
