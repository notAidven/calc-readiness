import {
  cityRosterNodeIds,
  createHardWinter,
  HARD_WINTER,
  type HardWinterState,
  hardWinterIsland,
  hardWinterView,
  type WinterBuilding,
  winterDamageStage,
} from "@cr/game";
import { Canvas } from "@react-three/fiber";
import type { ReactElement, RefObject } from "react";
import * as THREE from "three";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { WINTER_NODE_ORDER } from "../../winter/hardWinterItems";
import { D1_SKILL_IDS, resolveBuildingModel } from "../buildingAssets";
import { CURRENT_ERA_ID } from "../eraDressing";
import { resolveTownHallModel, TOWN_HALL_ID } from "../townHall";
import {
  footprintFor,
  type GroundPoint,
  ISLAND_GRASS_RADIUS,
  type PlacedTransform,
} from "../worldLayout";
import { applyCameraAction, controlsDistance, type OrbitControlsLike } from "./applyOrbit";
import { CityCanvasHost } from "./CityCanvasHost";
import { CityLighting } from "./CityLighting";
import type { ScenePlacement, SceneTownHall } from "./CityScene";
import {
  FROST_SHELL_NAME,
  frostShellModel,
  MAX_SHELL_RATIO,
  quantizeBuildingHeight,
} from "./frostStage";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { PlacedBuilding } from "./PlacedBuilding";
import { TownHall } from "./TownHall";
import { WinterInCity } from "./WinterInCity";
import { DRIFT_NAME } from "./winterScene";
import { WINTER_LIGHT, WINTER_SCENE_TONES } from "./winterTones";

import "../../styles.css";
import { eraCityLayout } from "../islandLand";

/**
 * **CAN YOU STILL TELL WHAT THIS BUILDING IS ONCE THE FROST HAS CLIMBED IT?**
 *
 * `frostStage.ts`'s third constraint: *"It must not out-grow the building it is on ... so the
 * worst damaged building is a rimed base and never a white block: a shell that swallowed the
 * silhouette would read as a ruin, which is the one state it has to be distinguishable from."*
 *
 * That constraint had a guard and the guard was hollow. `frostSeam.test.ts` asserted the crust
 * against `MAX_BUILD_HEIGHT * 0.25` and against the neutral scaffold's height, and both are true
 * statements about things that are not buildings: the cap is 24u, no era-one building renders
 * past 9.769u, and the two shortest render at **1.828u** and **2.149u** against a stage-two crust
 * of 2.56u. So the crust was 140% and 119% of them and every assertion in the tree was green.
 *
 * **A FOOTPRINT IS NOT A HEIGHT.** That is why the population here is BUILDINGS rather than plot
 * shapes: two nodes share a 2x2 and render 4.821u and 9.769u, so a rule proved on one of them
 * proves nothing about the other. Every measurement below is taken off a drawn scene with the
 * node's real GLB in it, after the contain-fit and the height cap have had their say, because
 * that is the only place a building's height exists.
 *
 * ## THE POPULATION, AND THE ONE MEMBER THAT IS EXEMPT
 *
 * Every node the city can place can be marked by the frost (`WinterInCity`'s
 * `frostStageByNodeId` is keyed off `winter.buildings`, which is every placement), so the
 * population is derived from the roster rather than from era one's six: it is every distinct
 * BUILDING SHAPE the city can put a crust on, which is a model and a plot. The unmapped nodes
 * collapse onto the neutral template, whose height is a function of the footprint alone, so they
 * enter as one subject per plot shape rather than 56 times.
 *
 * The hub is the exemption, it is named rather than quietly dropped, and it is asserted in both
 * directions: `TownHall.tsx` takes the winter's weather and its drifts but mounts no
 * `BuildingFrostCrust`, so a hall cannot wear a crust today however damaged the engine says it
 * is. {@link test} "the hub is exempt" fails the day one is wired onto it, which is the day this
 * population has to grow.
 *
 * ## AND THE FRAMES, BECAUSE THIS IS A SPATIAL CLAIM
 *
 * A crust that measures correctly and is invisible behind the drifts is not a fixed defect, and
 * a computed height cannot tell the difference. So the photographs at the bottom put era one's
 * two SHORTEST buildings beside its TALLEST at every stage, at 1024x580, framed to show the
 * ground they stand on and the neighbour they are being compared with.
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's own short laptop window. Named in every filename, per the spatial-claim rule. */
const VIEW = { width: 1024, height: 580 } as const;

/** The stages the engine authors, so this file holds no opinion about the ladder. */
const STAGES = HARD_WINTER.damage.stages;

/**
 * **THE RULING, and it is stated here rather than derived from {@link MAX_SHELL_RATIO}.**
 *
 * "A rimed base and never a white block" is a claim about a share of the silhouette, so half is
 * the ceiling: a crust that reaches half of its building has stopped being a base. Written as a
 * literal so that raising the ratio past what constraint 3 allows fails HERE, against buildings
 * as they render, and not only against the constant's own docblock.
 */
const SILHOUETTE_CEILING = 0.5;

/**
 * And a floor, because a crust nobody can see satisfies every ceiling.
 *
 * At the worst stage the crust has to be a real band up the wall. This is deliberately well
 * under the shipped ratio: it is here to catch a crust that collapsed to nothing, not to pin the
 * art.
 */
const SILHOUETTE_FLOOR = 0.2;

test("the height quantum shares only the crusts its cache key says it shares", () => {
  const sameBucketA = 2.816;
  const sameBucketB = 2.826;
  const differentBucket = 2.85;
  const footprint = { w: 2, d: 2 } as const;

  const first = frostShellModel(footprint, STAGES, STAGES, sameBucketA);
  const same = frostShellModel(footprint, STAGES, STAGES, sameBucketB);
  const different = frostShellModel(footprint, STAGES, STAGES, differentBucket);
  expect(first).not.toBeNull();
  expect(same).not.toBeNull();
  expect(different).not.toBeNull();

  expect(quantizeBuildingHeight(sameBucketA)).toBe(quantizeBuildingHeight(sameBucketB));
  expect(same, "two raw heights in one quantum did not share their cached crust").toBe(
    first,
  );
  expect(new THREE.Box3().setFromObject(same as THREE.Object3D).max.y).toBe(
    new THREE.Box3().setFromObject(first as THREE.Object3D).max.y,
  );

  expect(quantizeBuildingHeight(differentBucket)).not.toBe(
    quantizeBuildingHeight(sameBucketA),
  );
  expect(
    different,
    "heights in different quantized buckets were aliased to one cached crust",
  ).not.toBe(first);
  expect(new THREE.Box3().setFromObject(different as THREE.Object3D).max.y).not.toBe(
    new THREE.Box3().setFromObject(first as THREE.Object3D).max.y,
  );
});

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
    restore = null;
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/* -------------------------------------------------------------------------- */
/* The population                                                             */
/* -------------------------------------------------------------------------- */

interface Subject {
  /** The node whose art and plot this subject is. */
  readonly nodeId: string;
  /** Whether it draws its own GLB or falls through to the shared neutral template. */
  readonly art: "glb" | "neutral";
}

/**
 * Every distinct building SHAPE the city can put a crust on: one entry per (model, plot) pair.
 *
 * Derived from the widest roster the city deals rather than written down, and deduplicated on
 * the resolved model plus the footprint, which is exactly what decides a rendered height. Era
 * one's six come in with their own GLBs; the unmapped nodes share the neutral template and enter
 * once per plot shape.
 */
const SUBJECTS: readonly Subject[] = (() => {
  const seen = new Set<string>();
  const subjects: Subject[] = [];
  for (const nodeId of [...D1_SKILL_IDS, ...cityRosterNodeIds("cyberpunk")]) {
    const model = resolveBuildingModel(nodeId, "built");
    const fp = footprintFor(nodeId);
    const key = `${model.url ?? model.kind}:${fp.w}x${fp.d}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    subjects.push({ nodeId, art: model.kind === "glb" ? "glb" : "neutral" });
  }
  return subjects;
})();

/** Enough clear space between lots that no two footprints (max 3 cells = 12u) can touch. */
const SPACING = 18;
const COLUMNS = 4;

function centreFor(index: number): GroundPoint {
  return {
    x: ((index % COLUMNS) - (COLUMNS - 1) / 2) * SPACING,
    z: (Math.floor(index / COLUMNS) - 1) * SPACING,
  };
}

/** One lot per (subject, stage) pair, so every measurement below is its own building. */
const LOTS: readonly { readonly subject: Subject; readonly stage: number }[] =
  SUBJECTS.flatMap((subject) =>
    Array.from({ length: STAGES }, (_, index) => ({ subject, stage: index + 1 })),
  );

/* -------------------------------------------------------------------------- */
/* Measuring a drawn scene                                                    */
/* -------------------------------------------------------------------------- */

function findAll(root: THREE.Object3D, name: string): THREE.Object3D[] {
  const found: THREE.Object3D[] = [];
  root.traverse((child) => {
    if (child.name === name) {
      found.push(child);
    }
  });
  return found;
}

/**
 * The world box of the meshes under `root`, skipping any subtree whose name is in `without`.
 *
 * Built from each mesh's own geometry and world matrix rather than through `setFromObject`,
 * which recurses and would pull a skipped subtree back in through its parent.
 */
function boxWithout(root: THREE.Object3D, without: readonly string[]): THREE.Box3 {
  root.updateWorldMatrix(true, true);
  const skip = new Set(without);
  const box = new THREE.Box3();
  const walk = (object: THREE.Object3D): void => {
    if (skip.has(object.name)) {
      return;
    }
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      mesh.geometry.computeBoundingBox();
      const bounds = mesh.geometry.boundingBox;
      if (bounds) {
        box.union(bounds.clone().applyMatrix4(mesh.matrixWorld));
      }
    }
    for (const child of object.children) {
      walk(child);
    }
  };
  walk(root);
  return box;
}

interface Reading {
  readonly nodeId: string;
  readonly stage: number;
  /** How tall the building's own model renders, in world units. */
  readonly building: number;
  /** How high the crust's crest stands, in world units. */
  readonly crest: number;
  /** The crust's ground span, so a crust with no volume cannot pass as one. */
  readonly width: number;
  readonly depth: number;
}

/** Mount every lot on one canvas and read each building against the crust it is wearing. */
async function readEveryLot(): Promise<readonly Reading[]> {
  let scene: THREE.Scene | null = null;
  let gl: THREE.WebGLRenderer | null = null;

  h = mount(
    <div style={{ width: 640, height: 480 }}>
      <Canvas
        dpr={1}
        camera={{ position: [0, 90, 90], fov: 45 }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          scene = state.scene;
          gl = state.gl;
        }}
      >
        <ambientLight intensity={1} />
        {LOTS.map(({ subject, stage }, index) => (
          <PlacedBuilding
            key={`${subject.nodeId}-${stage}`}
            nodeId={`${subject.nodeId}#${stage}`}
            center={centreFor(index)}
            rotationY={0}
            footprint={footprintFor(subject.nodeId)}
            model={resolveBuildingModel(subject.nodeId, "built")}
            mastery={0}
            reducedMotion
            celebrateToken={0}
            winter
            frostStage={stage}
            frostStages={STAGES}
            onSelect={() => undefined}
          />
        ))}
      </Canvas>
    </div>,
  );

  await waitFor(() => scene !== null && gl !== null, "the canvas never created", 30000);
  const drawn = scene as unknown as THREE.Scene;
  const renderer = gl as unknown as THREE.WebGLRenderer;

  // Every lot has to have a crust before anything is measured. The GLBs resolve behind their own
  // Suspense boundaries and `BuildingFrostCrust` needs a frame with a measurable model in it
  // before it can build one, so this is what makes a too-early reading fail rather than pass.
  await waitFor(
    () =>
      LOTS.every(({ subject, stage }) => {
        const group = drawn.getObjectByName(`building-${subject.nodeId}#${stage}`);
        return group !== undefined && findAll(group, FROST_SHELL_NAME).length === 1;
      }),
    "a lot never grew a frost crust",
    40000,
  );
  await waitFor(
    () => renderer.info.render.triangles > 0,
    "the renderer submitted nothing",
    20000,
  );
  // One more beat: the crust is rebuilt from a `useFrame` measurement, so the first frame that
  // has a crust at all may still be carrying the one built from a part-loaded stack.
  await new Promise<void>((resolve) => setTimeout(resolve, 400));

  return LOTS.map(({ subject, stage }) => {
    const group = drawn.getObjectByName(`building-${subject.nodeId}#${stage}`);
    if (!group) {
      throw new Error(`${subject.nodeId} at stage ${stage} never reached the scene`);
    }
    const shell = findAll(group, FROST_SHELL_NAME)[0] as THREE.Object3D;
    // The building's OWN silhouette: its model, without the crust it is wearing and without the
    // snow banked against its walls, both of which are things standing beside it.
    const model = boxWithout(group, [FROST_SHELL_NAME, DRIFT_NAME]);
    const crust = boxWithout(shell, []);
    return {
      nodeId: subject.nodeId,
      stage,
      building: model.max.y - model.min.y,
      crest: crust.max.y,
      width: crust.max.x - crust.min.x,
      depth: crust.max.z - crust.min.z,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* The guard                                                                  */
/* -------------------------------------------------------------------------- */

test("no crust out-grows the building it is on, at any stage, as rendered", async () => {
  // THE POPULATION IS REAL BEFORE ANYTHING IS MEASURED. Six of era one's own art plus at least
  // one neutral-template shape, so a roster that stopped resolving GLBs cannot make this pass by
  // having less to look at.
  expect(
    SUBJECTS.filter((s) => s.art === "glb").length,
    "era one's authored buildings are not in the population",
  ).toBeGreaterThanOrEqual(6);
  expect(
    SUBJECTS.filter((s) => s.art === "neutral").length,
    "no fallback-template shape is in the population",
  ).toBeGreaterThanOrEqual(1);
  expect(LOTS.length).toBe(SUBJECTS.length * STAGES);
  expect(STAGES).toBeGreaterThanOrEqual(2);

  const readings = await readEveryLot();
  expect(readings).toHaveLength(LOTS.length);

  const worst: string[] = [];
  for (const reading of readings) {
    const share = reading.crest / reading.building;
    worst.push(
      `${reading.nodeId} stage ${reading.stage}: ${reading.building.toFixed(3)}u building, ${reading.crest.toFixed(3)}u crest, ${(share * 100).toFixed(0)}%`,
    );

    // A crust with real volume. Every ceiling below is satisfied by nothing at all.
    expect(reading.building, `${reading.nodeId} rendered no building`).toBeGreaterThan(0.5);
    expect(reading.crest, `${reading.nodeId} stage ${reading.stage} crust`).toBeGreaterThan(
      0,
    );
    expect(reading.width).toBeGreaterThan(0);
    expect(reading.depth).toBeGreaterThan(0);

    // AND CONSTRAINT 3, against the building rather than against the cap.
    expect(
      share,
      `${reading.nodeId} at stage ${reading.stage} wears a crust ${(share * 100).toFixed(0)}% of its own ${reading.building.toFixed(3)}u height`,
    ).toBeLessThan(SILHOUETTE_CEILING);
  }

  // AND AT THE WORST STAGE IT IS STILL A REAL BAND, so "under half" cannot be met by a crust
  // that vanished. Reported together, because the pair is the design: visible and not a block.
  for (const reading of readings.filter((r) => r.stage === STAGES)) {
    expect(
      reading.crest / reading.building,
      `${reading.nodeId}'s worst crust is only ${((reading.crest / reading.building) * 100).toFixed(0)}% of it`,
    ).toBeGreaterThan(SILHOUETTE_FLOOR);
  }

  // AND IT CLIMBS PER QUANTIZED BUILDING HEIGHT rather than per plot shape. Raw heights inside
  // one 1/32u cache bucket deliberately share a crust; different buckets may not.
  const byNode = new Map<string, Reading[]>();
  for (const reading of readings) {
    byNode.set(reading.nodeId, [...(byNode.get(reading.nodeId) ?? []), reading]);
  }
  for (const [nodeId, all] of byNode) {
    const climb = all.sort((a, b) => a.stage - b.stage).map((r) => r.crest);
    for (let index = 1; index < climb.length; index += 1) {
      expect(
        climb[index] as number,
        `${nodeId} stage ${index + 1} against ${index}: ${JSON.stringify(climb)}`,
      ).toBeGreaterThan(climb[index - 1] as number);
    }
  }
  const heights = new Set(readings.map((r) => r.building.toFixed(2)));
  expect(
    heights.size,
    `the population renders only ${heights.size} distinct heights, so "per building" is untested`,
  ).toBeGreaterThanOrEqual(4);
  const worstStage = readings.filter((r) => r.stage === STAGES);
  const quantizedHeights = new Set(
    worstStage.map((r) => quantizeBuildingHeight(r.building)),
  );
  const crests = new Set(worstStage.map((r) => r.crest.toFixed(4)));
  expect(
    crests.size,
    `${quantizedHeights.size} quantized height buckets wear only ${crests.size} distinct crusts: ${worst.join(" | ")}`,
  ).toBe(quantizedHeights.size);
}, 120000);

/**
 * **THE HUB IS EXEMPT, AND HERE IS THE REASON AND THE BOTH-WAYS CHECK.**
 *
 * The hall is a winter building like any other, so the engine can and does damage it. It draws
 * no crust: `TownHall.tsx` takes the weather and the drifts and mounts no `BuildingFrostCrust`,
 * which is why it is out of the population above rather than a member that keeps passing.
 *
 * Left out silently, a hall that later grew a crust would never be measured by anything. So this
 * asserts the exemption itself: the hall is really in a drawn winter scene (the floor), and it
 * really has no crust in it (the exemption). Wire one onto it and this fails, at the hall, with
 * the reason attached.
 */
test("the hub is exempt from the crust, and says so", async () => {
  let scene: THREE.Scene | null = null;
  const footprint = footprintFor(TOWN_HALL_ID);

  h = mount(
    <div style={{ width: 360, height: 360 }}>
      <Canvas
        dpr={1}
        camera={{ position: [18, 16, 18], fov: 40 }}
        onCreated={(state) => {
          scene = state.scene;
        }}
      >
        <ambientLight intensity={1} />
        <TownHall
          center={{ x: 0, z: 0 }}
          rotationY={0}
          footprint={footprint}
          model={resolveTownHallModel("built")}
          reducedMotion
          celebrateToken={0}
          winter
          onSelect={() => undefined}
        />
      </Canvas>
    </div>,
  );

  await waitFor(() => scene !== null, "the canvas never created", 30000);
  const drawn = scene as unknown as THREE.Scene;
  await waitFor(
    () => drawn.getObjectByName(`building-${TOWN_HALL_ID}`) !== undefined,
    "the hall never reached the scene",
    30000,
  );
  const hall = drawn.getObjectByName(`building-${TOWN_HALL_ID}`) as THREE.Object3D;
  // THE FLOOR: it is really a drawn hall in a winter, with the weather on it, so the exemption
  // below is about a building rather than about an empty group. Its GLB resolves behind its own
  // Suspense boundary while the drifts mount at once, so both are waited on.
  await waitFor(
    () =>
      findAll(hall, DRIFT_NAME).length === 1 &&
      Number.isFinite(boxWithout(hall, [DRIFT_NAME]).max.y),
    "the hall never drew a model inside a winter",
    30000,
  );
  expect(
    boxWithout(hall, [DRIFT_NAME]).max.y,
    "the hall has no height, so this exemption is about an empty group",
  ).toBeGreaterThan(1);

  // THE EXEMPTION.
  expect(
    findAll(hall, FROST_SHELL_NAME).length,
    "the hub now wears a frost crust, so it belongs in the population above",
  ).toBe(0);
}, 60000);

/* -------------------------------------------------------------------------- */
/* The frames                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The three buildings in every frame, and the reason it is these three.
 *
 * `NUM.3` (the Workshop, 1.828u on its 1x1) and `NUM.F` (the Store, 2.149u) are era one's two
 * shortest and are the two the cap buried. `NUM.5` (the Tower, 9.769u) is in shot because "can
 * you still tell what this building is" is a comparison: a crust judged on the Tower alone is
 * what produced the defect, and a crust judged on the Workshop alone cannot show that the same
 * banding still reads on a tall building.
 */
const SUBJECT_ROW: readonly string[] = ["NUM.3", "NUM.F", "NUM.5"];
const ROW_SPACING = 11;

/**
 * The heading the row is photographed from, and the row is laid out ACROSS it.
 *
 * A row laid along X and viewed from a diagonal runs into the corners of the frame, which is
 * what put a building half out of the first set of these. So the lots are placed along the
 * ground axis PERPENDICULAR to the camera's heading, which puts them side by side on screen
 * whatever heading is chosen, and the heading stays an oblique one because a building read
 * head-on is not the view the game gives.
 */
const ROW_AZIMUTH = -Math.PI * 0.16;

function rowCentre(index: number): GroundPoint {
  const offset = (index - (SUBJECT_ROW.length - 1) / 2) * ROW_SPACING;
  return { x: Math.cos(ROW_AZIMUTH) * offset, z: -Math.sin(ROW_AZIMUTH) * offset };
}

/** Where this test's viewport sits in the browser window, so a capture can be clipped to it. */
function testViewportBox(): { x: number; y: number; width: number; height: number } {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const box = frameElement.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
  };
}

/**
 * The composited frame, over CDP.
 *
 * `page.screenshot` is Playwright's locator capture and never gets past *"waiting for element to
 * be stable"* over a canvas running `frameloop="always"`; `winterIslandVisible.browser.test.tsx`
 * records the same finding. CDP takes the frame as it stands.
 */
async function capture(): Promise<string> {
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const box = testViewportBox();
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
  });
  if (!shot.data) {
    throw new Error("CDP returned no screenshot data");
  }
  return shot.data;
}

async function keep(name: string, shot: string): Promise<void> {
  if (SHOTS) {
    await commands.writeFile(
      `apps/web/src/city/three/__screenshots__/frost-crust/${name}.png`,
      shot,
      { encoding: "base64" },
    );
  }
}

/** Width and height out of a PNG's IHDR, so a scaled capture cannot pass for the viewport. */
function pngSize(base64: string): { width: number; height: number } {
  const binary = atob(base64);
  const at = (i: number): number => binary.charCodeAt(i) & 0xff;
  const read = (offset: number): number =>
    (at(offset) << 24) | (at(offset + 1) << 16) | (at(offset + 2) << 8) | at(offset + 3);
  expect(binary.slice(1, 4), "not a PNG").toBe("PNG");
  return { width: read(16) >>> 0, height: read(20) >>> 0 };
}

/**
 * **THE CAMERA IS FITTED TO THE SUBJECT AFTER IT EXISTS, NOT GUESSED BEFORE IT DOES.**
 *
 * `winterShieldAndThreat.browser.test.tsx` records what a pair of hardcoded vectors cost that
 * frame set (ten photographs of the inside of a roof), so the frame here is computed off the
 * scene graph. The TILT stays the game's own `VILLAGE_CAMERA.polarAngle`, the 49 degrees of
 * elevation at which the drifts hide the foot of a wall, because a crust photographed from a
 * friendlier angle is not evidence about the shipped one.
 */
function frameSubject(
  camera: THREE.PerspectiveCamera,
  /**
   * One box PER BUILDING rather than one box around all of them.
   *
   * A row laid diagonally in world space has a world-axis-aligned union box whose corners are
   * empty sky, and fitting to those corners is what put this row at 56.8u when 40u contains it:
   * a correctly framed picture, taken from too far away, which is exactly the kind of frame
   * nobody notices is wrong.
   */
  boxes: readonly THREE.Box3[],
  aspect: number,
): void {
  const subject = new THREE.Box3();
  for (const box of boxes) {
    subject.union(box);
  }
  // THE ASPECT IS READ OFF THE CANVAS, not off the camera. R3F sets `camera.aspect` from its own
  // resize observer, so at the moment this runs it can still be the square it was created with:
  // measured, a fit computed against a stale 1.0 put the row across 45% of a 1.77 frame and read
  // as a correctly framed picture taken from too far away.
  camera.aspect = aspect;
  const centre = subject.getCenter(new THREE.Vector3());
  const polar = VILLAGE_CAMERA.polarAngle;
  // The camera's own basis at this heading and tilt, so the fit below is computed in the frame
  // the picture is actually taken in. A per-world-axis fit is only right for the one heading it
  // was reasoned about and crops silently at every other; a bounding sphere never crops and
  // wastes most of a wide frame on sky.
  const back = new THREE.Vector3(
    Math.sin(polar) * Math.sin(ROW_AZIMUTH),
    Math.cos(polar),
    Math.sin(polar) * Math.cos(ROW_AZIMUTH),
  ).normalize();
  const right = new THREE.Vector3()
    .crossVectors(new THREE.Vector3(0, 1, 0), back)
    .normalize();
  const up = new THREE.Vector3().crossVectors(back, right).normalize();

  const halfV = Math.tan((camera.fov * Math.PI) / 360);
  const halfH = halfV * aspect;
  let distance = 0;
  for (const box of boxes) {
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          const offset = new THREE.Vector3(x, y, z).sub(centre);
          const depth = offset.dot(back);
          distance = Math.max(
            distance,
            depth + Math.abs(offset.dot(right)) / halfH,
            depth + Math.abs(offset.dot(up)) / halfV,
          );
        }
      }
    }
  }
  distance *= 1.1;

  camera.position.copy(centre).addScaledVector(back, distance);
  camera.lookAt(centre);
  camera.updateProjectionMatrix();
}

/** Stage 0 is the unmarked building, which is the reference the other three are read against. */
const FRAME_STAGES: readonly number[] = [0, ...Array.from({ length: 3 }, (_, i) => i + 1)];

test.runIf(SHOTS)(
  `photographs the two shortest buildings beside the tallest at every stage, ${VIEW.width}x${VIEW.height}`,
  async () => {
    const taken = new Map<string, string>();
    for (const stage of FRAME_STAGES) {
      await page.viewport(VIEW.width, VIEW.height);
      let gl: THREE.WebGLRenderer | null = null;
      let scene: THREE.Scene | null = null;
      let camera: THREE.PerspectiveCamera | null = null;

      h = mount(
        <div style={{ width: VIEW.width, height: VIEW.height }}>
          <Canvas
            shadows
            dpr={1}
            camera={{
              position: [30, 30, 30],
              fov: 32,
              near: VILLAGE_CAMERA.nearPlane,
              far: ISLAND_GRASS_RADIUS * VILLAGE_CAMERA.farPlaneRatio,
            }}
            gl={{ preserveDrawingBuffer: true }}
            onCreated={(state) => {
              state.gl.toneMapping = THREE.ACESFilmicToneMapping;
              state.gl.toneMappingExposure = WINTER_LIGHT.exposure;
              gl = state.gl;
              scene = state.scene;
              camera = state.camera as THREE.PerspectiveCamera;
            }}
          >
            <color attach="background" args={[WINTER_LIGHT.sky]} />
            <CityLighting islandRadius={ISLAND_GRASS_RADIUS} variant="day" winter />
            {/* The near-white snow the crust has to be visible against, which is half of why a
                pale slab on a pale ground is the hard case. */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[140, 140]} />
              <meshStandardMaterial color={WINTER_SCENE_TONES.SNOW_LIT} roughness={0.95} />
            </mesh>
            {SUBJECT_ROW.map((nodeId, index) => (
              <PlacedBuilding
                key={nodeId}
                nodeId={nodeId}
                center={rowCentre(index)}
                rotationY={0}
                footprint={footprintFor(nodeId)}
                model={resolveBuildingModel(nodeId, "built")}
                mastery={2}
                reducedMotion
                celebrateToken={0}
                winter
                frostStage={stage}
                frostStages={STAGES}
                /* The dressing a frost-marked building really wears while a winter is on.
                   This said `safe` until #388 removed that badge: an unthreatened building
                   now carries nothing and keeps its mastery stars, so `crisisDressing` hands
                   `null` up for a standing building the front does not reach this round,
                   which is the case these three are in. Stars in the frame are therefore
                   correct rather than a screen no player sees. */
                crisisStatus={null}
                onSelect={() => undefined}
              />
            ))}
          </Canvas>
        </div>,
      );

      await waitFor(
        () => gl !== null && scene !== null && camera !== null,
        "no canvas",
        30000,
      );
      const drawn = scene as unknown as THREE.Scene;
      const renderer = gl as unknown as THREE.WebGLRenderer;
      await waitFor(
        () =>
          SUBJECT_ROW.every(
            (nodeId) => drawn.getObjectByName(`building-${nodeId}`) !== undefined,
          ) && renderer.info.render.triangles > 200,
        "the row never finished drawing",
        40000,
      );
      if (stage > 0) {
        await waitFor(
          () =>
            SUBJECT_ROW.every((nodeId) => {
              const group = drawn.getObjectByName(`building-${nodeId}`);
              return group !== undefined && findAll(group, FROST_SHELL_NAME).length === 1;
            }),
          `a building never grew its stage ${stage} crust`,
          40000,
        );
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      const boxes: THREE.Box3[] = [];
      for (const nodeId of SUBJECT_ROW) {
        const group = drawn.getObjectByName(`building-${nodeId}`);
        if (group) {
          group.updateWorldMatrix(true, true);
          boxes.push(new THREE.Box3().setFromObject(group));
        }
      }
      expect(boxes, "nothing to photograph").toHaveLength(SUBJECT_ROW.length);
      const canvas = h.host.querySelector("canvas") as HTMLCanvasElement;
      expect(canvas.clientWidth, "the canvas is not the viewport's width").toBe(VIEW.width);
      frameSubject(
        camera as unknown as THREE.PerspectiveCamera,
        boxes,
        canvas.clientWidth / canvas.clientHeight,
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 400));

      // A throwaway capture: the first clipped capture after a mount puts a device-metrics
      // override on the page, which R3F reads as a resize, so the frame it hands back was drawn
      // before that settled (`winterIslandVisible.browser.test.tsx` measured it as flat sky).
      await capture();
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
      const shot = await capture();
      const name = `${VIEW.width}x${VIEW.height}-stage-${stage}-workshop-store-tower`;
      await keep(name, shot);

      const size = pngSize(shot);
      expect(size.width, `${name} came back ${size.width}px wide`).toBe(VIEW.width);
      expect(size.height, `${name} came back ${size.height}px tall`).toBe(VIEW.height);
      // AND NO TWO STAGES ARE THE SAME FRAME. A byte-identical capture is how a stale canvas
      // layer passes for a second witness, and four frames of one crust would be one piece of
      // evidence wearing four filenames.
      for (const [other, bytes] of taken) {
        expect(shot === bytes, `stage ${stage} is byte-identical to ${other}`).toBe(false);
      }
      taken.set(`stage ${stage}`, shot);

      h?.cleanup();
      h = null;
    }
    expect(taken.size).toBe(FRAME_STAGES.length);
  },
  300000,
);

/* -------------------------------------------------------------------------- */
/* And the same claim at the distance the game puts them at                   */
/* -------------------------------------------------------------------------- */

const LAYOUT = eraCityLayout("prehistoric");

/**
 * A compact city with the two shortest buildings and the Tower in the middle of it.
 *
 * Compact for the reason `winterProtectionStates.browser.test.tsx` gives: `winterFraming` dollies
 * out until the whole settlement fits the strip the sidebar leaves, so a spread city is
 * photographed from further away and every building in it is smaller. A cluster puts these three
 * on screen at the size the game gives them at rest, which is the size the read has to survive.
 */
const ISLAND_CITY: readonly PlacedTransform[] = [
  { nodeId: "NUM.3", col: -2, row: 1, rot: 0 },
  { nodeId: "NUM.F", col: 1, row: 1, rot: 0 },
  { nodeId: "NUM.5", col: 1, row: -2, rot: 0 },
  { nodeId: "NUM.2", col: -2, row: -2, rot: 0 },
];
const ISLAND_HALL: PlacedTransform = { nodeId: TOWN_HALL_ID, col: 3, row: -1, rot: 0 };

/** Damage points that put a standing building on the frost's middle appearance. */
const MARKED_DAMAGE = 1;

/**
 * How many notches of the PLAYER'S OWN zoom control the close island frame is taken at.
 *
 * `applyCameraAction(controls, "zoomIn")` is the button and the wheel, so this is a view a
 * player can reach rather than a camera of this test's invention.
 */
const ZOOM_NOTCHES = 3;

/**
 * The winter these four stand in, built from the engine's own opening state.
 *
 * Two fields are moved and nothing else: which ground is frozen, and what damage each building
 * carries. Both are states `closeRound` itself writes, so the stage each building wears is
 * `winterDamageStage`'s reading of a board the reducer could reach rather than a number this
 * file chose. At the shipped `damage.ruin_at: 2` one damage point is the only standing damage
 * there is, and it reads the middle appearance.
 */
function winterWithMarkedBuildings(): HardWinterState {
  const opening = createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: ISLAND_CITY.map((p) => ({ node_id: p.nodeId, col: p.col, row: p.row })),
  });
  const island = hardWinterIsland(CURRENT_ERA_ID);
  const frozen = island.cells.filter((key) => (island.rim_depth.get(key) ?? 9) <= 1);
  return {
    ...opening,
    round: 3,
    frozen,
    buildings: opening.buildings.map((building: WinterBuilding) => ({
      ...building,
      damage: MARKED_DAMAGE,
      cold_rounds: 1,
    })),
  };
}

function boardFor(winter: HardWinterState) {
  const view = hardWinterView(winter, { fire_preview: null });
  const frostStageByNodeId = new Map<string, number>();
  for (const building of winter.buildings) {
    const stage = winterDamageStage(building);
    if (building.state === "standing" && stage > 0) {
      frostStageByNodeId.set(building.node_id, stage);
    }
  }
  return {
    rows: view.rows,
    frostStageByNodeId: frostStageByNodeId as ReadonlyMap<string, number>,
  };
}

const SCENE_PLACED: readonly ScenePlacement[] = ISLAND_CITY.map((p) => ({
  nodeId: p.nodeId,
  col: p.col,
  row: p.row,
  rot: p.rot,
  model: resolveBuildingModel(p.nodeId, "built"),
  mastery: 2,
  celebrateToken: 0,
}));

const SCENE_HALL: SceneTownHall = {
  col: ISLAND_HALL.col,
  row: ISLAND_HALL.row,
  rot: ISLAND_HALL.rot,
  model: resolveTownHallModel("built"),
  celebrateToken: 0,
};

function IslandWithMarkedBuildings({
  board,
  controlsRef,
}: {
  readonly board: ReturnType<typeof boardFor>;
  readonly controlsRef: RefObject<OrbitControlsLike | null>;
}): ReactElement {
  return (
    <div className="city-shell">
      <div className="city-surface" data-winter="true">
        <div className="city-viewport" data-testid="city-viewport">
          <CityCanvasHost
            enableCanvas
            layout={LAYOUT}
            placed={SCENE_PLACED}
            townHall={SCENE_HALL}
            variant="day"
            reducedMotion
            controlsRef={controlsRef}
            onSelect={() => undefined}
            eraId={CURRENT_ERA_ID}
            winterRows={board.rows}
            frostStageByNodeId={board.frostStageByNodeId}
            fallback={<div data-testid="canvas-fallback" />}
          />
        </div>
      </div>
      <WinterInCity
        placements={ISLAND_CITY}
        townHall={ISLAND_HALL}
        canvasLive
        practisedNodeIds={WINTER_NODE_ORDER}
        onBoard={() => undefined}
        onExit={() => undefined}
      />
    </div>
  );
}

/**
 * **AND ON THE REAL ISLAND, BEHIND THE REAL SIDEBAR.**
 *
 * The row above is the silhouette comparison at a distance that lets a reviewer see it. This is
 * the other half of the same claim: the size the game actually gives these buildings once
 * `winterFraming` has dollied the settlement into the strip the crisis panel leaves free. A crust
 * that reads at 11 units and vanishes at the shipped framing is not fixed.
 */
test.runIf(SHOTS)(
  `photographs the marked buildings on the real island at ${VIEW.width}x${VIEW.height}`,
  async () => {
    await page.viewport(VIEW.width, VIEW.height);
    const controlsRef = { current: null as OrbitControlsLike | null };
    h = mount(
      <IslandWithMarkedBuildings
        board={boardFor(winterWithMarkedBuildings())}
        controlsRef={controlsRef}
      />,
    );

    await waitFor(
      () => document.querySelector(".city-viewport canvas") !== null,
      "the city canvas never mounted",
      40000,
    );
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-shell") !== null,
      "the crisis panel never rendered",
      40000,
    );
    await document.fonts.ready;
    await new Promise<void>((resolve) => setTimeout(resolve, 3500));
    await capture();
    await new Promise<void>((resolve) => setTimeout(resolve, 800));

    const composite = await capture();
    await keep(`${VIEW.width}x${VIEW.height}-in-game-marked-buildings`, composite);

    // And the island with the sidebar out of the way, which is where the buildings behind its
    // own column can be read. Same camera, same frame: only the overlay moves.
    const overlay = document.querySelector<HTMLElement>(".winter-in-city");
    if (!overlay) {
      throw new Error("the winter's overlay never mounted, so there is nothing to hide");
    }
    overlay.style.visibility = "hidden";
    let island: string;
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      island = await capture();
    } finally {
      overlay.style.visibility = "";
    }
    await keep(`${VIEW.width}x${VIEW.height}-island-marked-buildings`, island);

    /*
     * AND AT THE PLAYER'S OWN ZOOM, because the two frames above answer "is it on screen" and
     * this claim is "can you tell what this building is". A crop would answer the second by
     * throwing away the first, which is the substitution the evidence rule is about; a dolly
     * keeps the ground, the drifts, the ice front and the neighbours in frame and simply gets
     * closer to them, the way a reviewer with a mouse wheel would. `CityScene` clamps the dolly
     * on the next frame whatever this asks for, so it cannot manufacture a view a player cannot
     * reach.
     */
    const controls = controlsRef.current;
    if (!controls) {
      throw new Error("the canvas never handed its controls out, so nothing can be zoomed");
    }
    const wide = controlsDistance(controls);
    for (let notch = 0; notch < ZOOM_NOTCHES; notch += 1) {
      applyCameraAction(controls, "zoomIn");
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 1200));
    const close = controlsDistance(controls);
    expect(close, "the player's zoom control moved the camera nowhere").toBeLessThan(wide);
    await capture();
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    overlay.style.visibility = "hidden";
    let closeIsland: string;
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      closeIsland = await capture();
    } finally {
      overlay.style.visibility = "";
    }
    await keep(`${VIEW.width}x${VIEW.height}-island-marked-buildings-zoomed`, closeIsland);

    for (const [name, shot] of [
      ["in-game", composite],
      ["island", island],
      ["island-zoomed", closeIsland],
    ] as const) {
      const size = pngSize(shot);
      expect(size.width, `${name} came back ${size.width}px wide`).toBe(VIEW.width);
      expect(size.height, `${name} came back ${size.height}px tall`).toBe(VIEW.height);
    }
    expect(composite === island, "the sidebar was still in the island frame").toBe(false);
    expect(island === closeIsland, "the zoom took no effect on the picture").toBe(false);
  },
  240000,
);
