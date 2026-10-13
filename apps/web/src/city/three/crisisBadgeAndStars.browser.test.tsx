import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { afterAll, afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import type { ResolvedBuildingModel } from "../buildingAssets";
import {
  footprintFor,
  ISLAND_GRASS_RADIUS,
  rotationYFor,
  transformCenter,
} from "../worldLayout";
import { CityLighting } from "./CityLighting";
import { CRISIS_MARKER_NAME, type CrisisStatus } from "./CrisisStatusMarker";
import { MASTERY_STARS_NAME } from "./MasteryStars";
import { PlacedBuilding } from "./PlacedBuilding";
import { WINTER_LIGHT } from "./winterTones";

/**
 * **THE CRISIS BADGE AND THE MASTERY STARS SHARE ONE SLOT, IN A SCENE THAT WAS ACTUALLY DRAWN.**
 *
 * This file was `winterShieldAndThreat.browser.test.tsx`, and most of it was about the storm
 * roof: whether the cap bedded onto a measured roofline, whether it refused an unmeasurable one,
 * whether a proposal was see-through, and a five-frame photograph set of a shielded building at
 * two viewports. The lead scrapped the roof on 2026-08-03 — *"scrap the shield youre using
 * completely - it doesnt need to have an actual shield over it other than an indicator over it
 * that says shielded"* — so every one of those claims is about geometry that no longer exists
 * and went with it.
 *
 * **WHAT SURVIVED IS EVERYTHING THE FILE SAID ABOUT THE BADGE AND THE STARS**, which was never
 * the shield's: the badge REPLACES the stars while a building is marked and gives them straight
 * back, an unthreatened standing building is badged with nothing at all and keeps its stars
 * through the whole winter, and a ruin is badged lost. Those are the 2026-08-01 ruling in a drawn
 * scene, they are assertions nothing cheaper can make — a mounted scene graph after the renderer
 * has submitted triangles — and they are why this file is renamed rather than deleted.
 *
 * The SHIELDED fact itself has not gone anywhere either. It is the building's floating label now
 * (`SkillLabels`), and `crisisLabels.test.ts` holds it against `crisisDressing`'s badge so the
 * caption and the mark over one building cannot contradict each other.
 */

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
    restore = null;
  }
});

/** Set `VITE_WINTER_SHOTS=1` to regenerate the photographs; CI does not. */

/**
 * The shared neutral built shell rather than a node's GLB.
 *
 * Every claim below is about the DRESSING — the storm roof, the badge, the stars — and none of
 * it is about which building is underneath. Using the procedural template keeps this off the
 * network, which is what lets it run unconditionally.
 */
function proceduralModel(nodeId: string): ResolvedBuildingModel {
  return {
    node_id: nodeId,
    stage: "built",
    modelStage: "built",
    kind: "built",
    url: null,
  };
}

interface Rendered {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
}

/** Mount one dressed building and wait until the renderer has actually drawn it. */
async function renderBuilding(props: {
  readonly nodeId: string;
  readonly crisisStatus?: CrisisStatus | null;
  readonly winter?: boolean;
  readonly mastery?: number;
  readonly ruined?: boolean;
  /**
   * `null` for a placement whose model has not resolved — `PlacedBuilding`'s documented "render
   * nothing" arm. Omit for the shared procedural shell, which is what every test here wants.
   */
  readonly model?: ResolvedBuildingModel | null;
}): Promise<Rendered> {
  let gl: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  const footprint = footprintFor(props.nodeId);
  const model = props.model === undefined ? proceduralModel(props.nodeId) : props.model;

  h = mount(
    <div style={{ width: 360, height: 360 }}>
      <Canvas
        dpr={1}
        camera={{ position: [16, 14, 16], fov: 32 }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          state.gl.toneMapping = THREE.ACESFilmicToneMapping;
          state.gl.toneMappingExposure = WINTER_LIGHT.exposure;
          state.camera.lookAt(0, 4, 0);
          gl = state.gl;
          scene = state.scene;
        }}
      >
        <CityLighting islandRadius={ISLAND_GRASS_RADIUS} variant="day" winter />
        <PlacedBuilding
          nodeId={props.nodeId}
          center={transformCenter({ col: 0, row: 0, rot: 0 }, footprint)}
          rotationY={rotationYFor(0)}
          footprint={footprint}
          model={model}
          mastery={props.mastery ?? 3}
          reducedMotion
          celebrateToken={0}
          ruined={props.ruined ?? false}
          winter={props.winter ?? true}
          crisisStatus={props.crisisStatus ?? null}
          onSelect={() => undefined}
        />
      </Canvas>
    </div>,
  );

  await waitFor(() => gl !== null && scene !== null, "the canvas never created", 20000);
  const renderer = gl as unknown as THREE.WebGLRenderer;
  await waitFor(
    () => renderer.info.render.triangles > 0,
    "the renderer submitted no triangles",
    20000,
  );
  const drawn = scene as unknown as THREE.Scene;
  if (model) {
    // AND THEN WAIT FOR THE DRESSING TO HAVE BEEN PLACED, which the triangle count above does
    // not imply and a sleep only bets on. See `dressingPlaced`.
    await dressingPlaced(renderer, drawn);
  } else {
    // Nothing to bed onto, on purpose, so there is no placement to wait for — only for enough
    // frames that a component which was GOING to place something has certainly had its chance.
    const start = renderer.info.render.frame;
    await waitFor(
      () => renderer.info.render.frame >= start + 3,
      `the render loop stalled at frame ${start}`,
      20000,
    );
  }
  return { scene: drawn, renderer };
}

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
 * Waits until the render loop has DRAWN a frame later than `after`, and answers with which.
 *
 * A timeout here is a finding rather than a nuisance: a canvas whose loop has stopped can only
 * be measured as whatever it last left behind, which is the one state nothing here may read.
 */
async function drawnAfter(renderer: THREE.WebGLRenderer, after: number): Promise<number> {
  await waitFor(
    () => renderer.info.render.frame > after,
    "the render loop stopped drawing, so nothing here could be measured on a fresh frame",
    5000,
  );
  return renderer.info.render.frame;
}

/**
 * The per-test budget, because the 15s default is smaller than this file's own waits.
 *
 * Every scene test below mounts a WebGL canvas and five of them mount two, and a canvas on the
 * runner is nothing like a canvas here: this file timed out at `15000ms` on *"a PROPOSED shield
 * is see-through in the live scene and a raised one is not"* — one of the two-mount ones — in run
 * [30767658327](CI run 30767658327).
 *
 * The default was never coherent for this file, which is the part worth fixing rather than
 * nudging: its own `waitFor` bounds are `20000ms`, so the test budget expired BEFORE any of them
 * could report, and a genuine miss arrived as a bare *"Test timed out in 15000ms"* naming a line
 * number and nothing else. 60s is what the siblings in this directory give a single-scene mount
 * (`crisisPanelFitsItsContent`, `frostCrustSilhouette`), and it leaves every bound in this file
 * room to fire its own message. No assertion is loosened by it: with the roof's placement
 * removed entirely, the file still goes red in about four seconds, not sixty.
 *
 * Set for the file rather than per test, because every test here is a scene test and owes the
 * same budget. Seven third arguments would also have cost ~250 lines of pure re-indentation, as
 * the formatter breaks a `test(name, fn, ms)` call across lines and moves every body with it.
 */
const SCENE_TEST_MS = 60000;

vi.setConfig({ testTimeout: SCENE_TEST_MS });

/**
 * How long the dressing may take to arrive before its absence is a defect rather than a wait.
 *
 * THIS IS A FAILURE BOUND AND NOT A SETTLING TIME, which is the whole difference between it and
 * the `setTimeout(260)` it replaces. A sleep waits 260ms and then measures whatever is there; a
 * bound waits exactly as long as the placement takes, and only fires if it never comes. So this
 * number is not a bet on how fast the machine is: nothing is read while it is still running. It
 * sits far above any real arrival — the placement lands inside the first draw here, so this is
 * hundreds of times that — and under the 15s a test is given, so a genuine miss can report which
 * piece never arrived instead of surfacing as a bare per-test timeout.
 */
const PLACEMENT_WAIT_MS = 4000;

/**
 * Every piece of dressing the render loop places, paired with where it has put it so far.
 *
 * BOTH are placed from `useFrame` and NEITHER is authored with a height: the badge's group and
 * the stars' are created at `y = 0` and each gets its real height assigned every frame from the
 * roofline it measures. So `y === 0` is not a plausible placement here, it is the state of never
 * having been placed — no building's roofline is at ground level, and `unplaced` below reads it
 * that way. (The storm roof was the third, and it was scrapped on 2026-08-03.)
 */
function placements(scene: THREE.Scene): { name: string; y: number }[] {
  return [CRISIS_MARKER_NAME, MASTERY_STARS_NAME].flatMap((name) =>
    findAll(scene, name).map((found) => ({ name, y: found.position.y })),
  );
}

/** The dressing the loop has not put on yet. Empty is the state everything below needs. */
function unplaced(scene: THREE.Scene): string[] {
  return placements(scene)
    .filter((at) => at.y === 0)
    .map((at) => at.name);
}

/**
 * Waits until the dressing has been PUT ON, and then until it has stopped moving.
 *
 * **A FIXED SLEEP WAS NOT A WAIT FOR THE LOOP, IT WAS A BET ON ITS FRAME RATE.** The storm roof
 * has no authored height: `BuildingShield` measures the building it covers and assigns
 * `cap.position.y` inside `useFrame`, and the badge then measures the model AND that roof, so it
 * is only right on a frame after the roof is. Before the loop has run them both, a world box
 * around either is a box around dressing that is not on the building yet.
 *
 * `setTimeout(260)` covers that on a machine whose frames are 16ms apart and covers nothing at
 * all on a two-core runner with a Chromium worker beside it, where the interval has been
 * measured at 475ms — one sleep, no draw. It lost on CI in run `30760334825`, on the roof's own
 * eaves: *"expected -0.8180639855194092 to be greater than 5.754545404539479"*. Neither number
 * is a near miss. `-0.8180639855194092` is the cap's world `min.y` with `position.y` still at
 * the authored `0`, reproduced to the last digit by zeroing it on a settled scene; and
 * `5.754545404539479` is `bareTop - 1.5` for a `bareTop` of `7.254545404539479`, which is that
 * same cap's placed `position.y` of `6.974545404539478` plus its `CAP_BED` of `0.28`. The
 * building had been measured perfectly. The roof had simply never been lifted onto it.
 *
 * So this waits for the property the measurements need rather than for a clock, in two parts,
 * and the second is not redundant: being PLACED is what the runner lacked, and being STILL is
 * what the badge needs, since it measures the roof and may be placed in the same frame the roof
 * is. Neither part can be satisfied by time passing, which is exactly what a sleep can be.
 *
 * A timeout here is a real finding, so it names the piece that is still at ground level instead
 * of letting a box be measured around it. Injected rather than argued, on this file:
 *
 *  - stop `BuildingShield` assigning the roof at all: **4 of 8 red** at *"the loop never put the
 *    dressing on: winter-shield-cap still at y=0 after 4000ms"*, which names the missing piece
 *    rather than reporting a bare per-test timeout as the first cut of this did;
 *  - let the assignment arrive 2s late instead, which is the runner's condition wound well past
 *    it: **8 of 8 green** here, where the 260ms sleep on that same injection fails with the
 *    runner's own message and both of its numbers.
 *
 * The assertions keep their own teeth either way: a roof placed at the WRONG height satisfies
 * both parts of this and still fails them.
 */
async function dressingPlaced(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
): Promise<void> {
  const signature = () =>
    placements(scene)
      .map((at) => `${at.name}@${at.y}`)
      .join("|");

  const deadline = Date.now() + PLACEMENT_WAIT_MS;
  while (unplaced(scene).length > 0) {
    if (Date.now() >= deadline) {
      throw new Error(
        `the loop never put the dressing on: ${unplaced(scene).join(", ")} still at y=0 after ${PLACEMENT_WAIT_MS}ms`,
      );
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }

  let drawn = renderer.info.render.frame;
  let previous = signature();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    drawn = await drawnAfter(renderer, drawn);
    const next = signature();
    if (next === previous) {
      return;
    }
    previous = next;
  }
  throw new Error(`the dressing never stopped moving between draws: ${previous}`);
}

test("the crisis badge REPLACES the mastery stars, and gives them back afterwards", async () => {
  const crisis = await renderBuilding({
    nodeId: "NUM.S",
    crisisStatus: "threatened",
    mastery: 3,
  });
  expect(findAll(crisis.scene, CRISIS_MARKER_NAME).length).toBe(1);
  expect(
    findAll(crisis.scene, MASTERY_STARS_NAME).length,
    "the stars did not step aside for the crisis badge",
  ).toBe(0);
  h?.cleanup();
  h = null;

  // The other direction, so the swap cannot be a permanent deletion: a crisis does not undo
  // mastery, and the ruling is that the stars come straight back when it ends.
  const calm = await renderBuilding({
    nodeId: "NUM.S",
    crisisStatus: null,
    winter: false,
    mastery: 3,
  });
  expect(findAll(calm.scene, MASTERY_STARS_NAME).length).toBe(1);
  expect(findAll(calm.scene, CRISIS_MARKER_NAME).length).toBe(0);
});

test("a building the winter has NOT reached keeps its stars and wears no badge", async () => {
  /*
   * THE 2026-08-01 RULING, IN A DRAWN SCENE.
   *
   * `CrisisStatusMarker` shipped a third state, `safe`, drawn as a stone hexagon on every standing
   * building at once, and the brief's protection ladder says an unthreatened building gets NOTHING
   * added. The lead ruled for the brief, so `crisisDressing` hands `null` up for a standing
   * building the frost has not reached and the stars keep their slot straight through the winter.
   *
   * The scene is a WINTER one, which is the whole point: `winter: true` with `crisisStatus: null`
   * is the state most of the settlement is in for most of a crisis, and it is the state the
   * hexagon used to occupy. Both halves are asserted, because the failure could go either way: a
   * badge back on an unthreatened building, or the stars lost to a swap that fires on the winter
   * rather than on the status.
   */
  const { scene } = await renderBuilding({
    nodeId: "NUM.S",
    crisisStatus: null,
    winter: true,
    mastery: 3,
  });
  expect(
    findAll(scene, CRISIS_MARKER_NAME).length,
    "an unthreatened standing building was badged during the winter",
  ).toBe(0);
  expect(
    findAll(scene, MASTERY_STARS_NAME).length,
    "the stars stepped aside for a status that is not there",
  ).toBe(1);
});

test("a ruin wears the lost badge", async () => {
  // The shield half of this test went with the storm roof on 2026-08-03 — it read
  // `shield: "raised", ruined: true` and required no roof on the rubble, which is a claim about
  // geometry that no longer exists. What survives is the badge, and it is the one the ruling
  // above turns on: a building the frost took is marked, and marked as lost.
  const { scene } = await renderBuilding({
    nodeId: "NUM.S",
    ruined: true,
    crisisStatus: "lost",
  });
  expect(findAll(scene, CRISIS_MARKER_NAME).length).toBe(1);
  expect(
    findAll(scene, MASTERY_STARS_NAME).length,
    "a ruin kept its mastery stars under the lost badge",
  ).toBe(0);
});
