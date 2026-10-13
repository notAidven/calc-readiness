import {
  createHardWinter,
  type HardWinterState,
  hardWinterReducer,
  hardWinterView,
  type WinterAction,
  type WinterFire,
} from "@cr/game";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { resolveBuildingModel } from "../buildingAssets";
import { CURRENT_ERA_ID } from "../eraDressing";
import { eraCityLayout } from "../islandLand";
import { resolveTownHallModel, TOWN_HALL_ID } from "../townHall";
import {
  footprintFor,
  ISLAND_GRASS_RADIUS,
  rotationYFor,
  transformCenter,
} from "../worldLayout";
import { CityLighting, cityEnvironment } from "./CityLighting";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { PlacedBuilding } from "./PlacedBuilding";
import { Roads } from "./Roads";
import { StarterIsland } from "./StarterIsland";
import { TownHall } from "./TownHall";
import { WinterGround } from "./WinterGround";
import { FUEL_STEPS } from "./winterFire";
import { WINTER_LIGHT } from "./winterTones";

/**
 * **WHAT THE CRISIS ACTUALLY LOOKS LIKE, PHOTOGRAPHED AT THE GAME'S OWN CAMERA.**
 *
 * `winterCrisisScene.browser.test.tsx` measures the frame — coverage, mean luminance, how much
 * of it is near-black. Statistics are what a guard can hold, and they are not what a reviewer
 * needs: "mean luminance 0.60 from eight headings" is compatible with a great many pictures, one
 * of which is the intended one. So this writes PNGs.
 *
 * Four shots, and the third is the point of the set. The design batch's reference plates were
 * drawn at roughly 16° of elevation and the game is locked at 49°, which costs a vertical about
 * 3.7x of its prominence against the ground plane it stands on
 * (`winterCamera.test.ts` measures it). Shooting the same scene at both tilts is the only way to
 * see what that costs the assets that were designed as verticals — the smoke column, the drifts
 * and the shove ice.
 *
 * The shots land in `__screenshots__/`, which is gitignored: they are evidence for a review and
 * not a fixture, and nothing here compares them to a baseline. What IS asserted is that each one
 * was written over a scene the renderer had actually drawn, so a run cannot report four
 * photographs of an empty canvas.
 *
 * ## IT IS OFF BY DEFAULT, AND THAT IS MEASURED RATHER THAN CAUTIOUS
 *
 * Run `VITE_WINTER_SHOTS=1 npm run test:browser` to regenerate the set.
 *
 * This is the only heavy thing in the browser suite: four full shadow-mapped scenes, each with
 * seven GLBs to fetch and parse, on a pool of two Chromium workers. Left enabled it does not
 * fail — it makes something ELSE fail. Measured over three runs of the whole suite on this
 * machine: without it, 85 files and 1,386 tests green in 31s; with it, 43s and one failure per
 * run, in a DIFFERENT file each time and never in this one —
 * `eraAdvanceShots.browser.test.tsx` once, then `EraAdvanceCeremony.browser.test.tsx`'s
 * "the scaffold did not grow across the beat" (0 against 7,583 of painted area). Both are
 * animation-timing assertions on a wall clock, and starving them of frames is what a
 * neighbouring test that saturates the GPU does to them. Either of them going red for that
 * reason is worse than not having these photographs in CI, because the next reader has no way
 * to tell it from a real regression in the ceremony.
 *
 * What CI keeps is `winterCrisisScene.browser.test.tsx`, which measures the same frames without
 * the GLBs or the shadow map and is in the green run above.
 */

/** Set `VITE_WINTER_SHOTS=1` to regenerate the photographs; CI does not, see the header. */
const ENABLED = Boolean(import.meta.env.VITE_WINTER_SHOTS);

const SHOT = { width: 1280, height: 800 };

/**
 * **THE LEAD'S ACTUAL WINDOW, and the reason a second viewport is in this file.**
 *
 * A comfortable developer window has hidden a real defect on this surface twice: `vh`-based
 * sizing and the framing of a fixed-tilt camera both behave differently on a short screen, and
 * a tall shot is not evidence about the screen the work is reviewed on. So the close shots that
 * judge an asset's own read are taken here, and the wide plates stay at {@link SHOT} because
 * their job is the whole island at two tilts.
 */
const SHORT = { width: 1024, height: 580 };
let restore: { width: number; height: number } | null = null;
let h: Harness | null = null;

beforeAll(async () => {
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

const LAYOUT = eraCityLayout("prehistoric");

/** Where the village camera sits at `azimuth` and `distance`, looking at the island centre. */
function cameraAt(
  azimuth: number,
  polar: number,
  distance: number,
): [number, number, number] {
  return [
    Math.sin(polar) * Math.sin(azimuth) * distance,
    Math.cos(polar) * distance + 2,
    Math.sin(polar) * Math.cos(azimuth) * distance,
  ];
}

function playRound(winter: HardWinterState, action: WinterAction): HardWinterState {
  let next = hardWinterReducer(winter, { type: "declare", action });
  next = hardWinterReducer(next, { type: "resolve", correct: 2, asked: 3 });
  return hardWinterReducer(next, { type: "end_round" });
}

/**
 * The board the shots are taken over: a settlement several rounds into a winter it is losing.
 *
 * `aimAt` is the cell a fire is being AIMED at, which is the state the candidate shot needs:
 * the engine projects `preview_tier` per covered cell only while a preview is asked for, so a
 * board built without one photographs an island with no candidates on it at all.
 */
function board(
  aimAt: { col: number; row: number } | null = null,
  roundsLeft: number | null = null,
): {
  rows: ReturnType<typeof hardWinterView>["rows"];
  fires: readonly WinterFire[];
  ruined: ReadonlySet<string>;
} {
  let winter = createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: PLACED.map((p) => ({ node_id: p.nodeId, col: p.col, row: p.row })),
  });
  // A pull-back was the third round of this plan until 2026-08-02, when the lead ruled the
  // give-up-ground action out. Every round is a fire now, and the winter is three rounds long.
  winter = playRound(winter, { kind: "fire", col: 1, row: 1 });
  winter = playRound(winter, { kind: "fire", col: -2, row: -1 });
  while (winter.phase !== "ended") {
    winter = playRound(winter, { kind: "fire", col: 1, row: 1 });
  }
  // The duration ladder: the same board with the fire's remaining rounds set, so the three
  // steps can be photographed from ONE pinned camera. The ward is unaffected by construction —
  // `fireWard` reads `radius` and only whether `rounds_left` is above zero — which is what
  // makes the three frames evidence about the footprint and not only about the fuel.
  if (roundsLeft !== null) {
    winter = {
      ...winter,
      fires: winter.fires.map((f) => ({ ...f, rounds_left: roundsLeft })),
    };
  }
  return {
    rows: hardWinterView(winter, { fire_preview: aimAt }).rows,
    fires: winter.fires,
    ruined: new Set(
      winter.buildings.filter((b) => b.state === "ruin").map((b) => b.node_id),
    ),
  };
}

/** A small settlement, laid out by hand so the shots frame something worth looking at. */
const PLACED = [
  { nodeId: "NUM.S", col: -3, row: -3, rot: 0 },
  { nodeId: "NUM.5", col: 1, row: -3, rot: 0 },
  { nodeId: "NUM.2", col: -4, row: 1, rot: 0 },
  { nodeId: "NUM.3", col: 2, row: 1, rot: 0 },
  { nodeId: "NUM.4", col: 3, row: -1, rot: 1 },
  { nodeId: "NUM.F", col: -1, row: 3, rot: 0 },
] as const;

const ROADS = [
  { col: -1, row: 0 },
  { col: 0, row: 0 },
  { col: 1, row: 0 },
  { col: 0, row: 1 },
  { col: 0, row: 2 },
  { col: -1, row: 2 },
  { col: 1, row: -1 },
  { col: 1, row: -2 },
];

interface Shot {
  readonly name: string;
  readonly winter: boolean;
  readonly polar: number;
  readonly distance: number;
  /** Defaults to the wide plate. The close shots use the lead's short window. */
  readonly viewport?: { readonly width: number; readonly height: number };
  /** What the camera looks at. Defaults to the island centre. */
  readonly target?: readonly [number, number, number];
  /**
   * Photograph the board MID-SELECTION, with a fire aimed at this cell. The candidate ground
   * only exists while a preview is asked for, so a shot of it has to say where.
   */
  readonly aimAt?: { readonly col: number; readonly row: number };
  /**
   * One step of the fire's DURATION ladder. Set on a set of shots that are otherwise identical,
   * so the frames differ in this and nothing else and the footprint lands in the same pixels.
   */
  readonly roundsLeft?: number;
}

const PLATE_POLAR = Math.PI / 2 - THREE.MathUtils.degToRad(16);

/** Where the board's first fire stands, so a close shot can be aimed at it. */
const FIRE_AT: readonly [number, number, number] = [(1 + 0.5) * 4, 0, (1 + 0.5) * 4];

const SHOTS: readonly Shot[] = [
  {
    name: "01-fair-weather-49deg",
    winter: false,
    polar: VILLAGE_CAMERA.polarAngle,
    distance: LAYOUT.cameraDistance,
  },
  {
    name: "02-winter-49deg-the-real-camera",
    winter: true,
    polar: VILLAGE_CAMERA.polarAngle,
    distance: LAYOUT.cameraDistance,
  },
  {
    // What the reference plates implied, for comparison only. The game never renders this.
    name: "03-winter-16deg-what-the-plates-implied",
    winter: true,
    polar: PLATE_POLAR,
    distance: LAYOUT.cameraDistance,
  },
  {
    name: "04-winter-49deg-full-zoom-out",
    winter: true,
    polar: VILLAGE_CAMERA.polarAngle,
    distance: LAYOUT.cameraDistance * VILLAGE_CAMERA.maxDistanceRatio,
  },
  {
    // THE FIRE, at the lead's window, with a building behind it and plain snow beside it. A
    // crop of the flame alone proves nothing about whether it reads as hot in the scene.
    name: "05-fire-beside-a-building-1024x580",
    winter: true,
    polar: VILLAGE_CAMERA.polarAngle,
    distance: LAYOUT.cameraDistance * 0.36,
    viewport: SHORT,
    target: FIRE_AT,
  },
  {
    // ALL FOUR GROUND STATES IN ONE FRAME, against the island's own terrain: frozen, the frost
    // line, ground a fire is holding and ground given up for good. One frame is what proves
    // both halves at once — that the tiles belong to the ground, and that the four are still
    // tellable apart.
    name: "06-four-ground-states-1024x580",
    winter: true,
    polar: VILLAGE_CAMERA.polarAngle,
    // Far enough out to reach the RIM, because the ground a pull-back gave up is the outer
    // ring and a frame that stops at the settlement holds only three of the four states.
    distance: LAYOUT.cameraDistance * 0.68,
    viewport: SHORT,
    target: [FIRE_AT[0] * 0.15, 0, FIRE_AT[2] * 0.15],
  },
  {
    // **THE CANDIDATE GROUND, MID-SELECTION** — the frame that judges the change from four
    // raised blue bars per cell to a ghost of the fire's own result. Framed WIDE ENOUGH to hold
    // the snow and the buildings around the candidates rather than cropped to them: the
    // question is whether an ochre patch reads as warm against this scene's blues, and a crop
    // of the patch alone is a picture of the one thing nobody doubted.
    name: "07-fire-candidates-mid-selection-1024x580",
    winter: true,
    polar: VILLAGE_CAMERA.polarAngle,
    distance: LAYOUT.cameraDistance * 0.55,
    viewport: SHORT,
    target: [FIRE_AT[0] * 0.2, 0, FIRE_AT[2] * 0.2],
    aimAt: { col: -1, row: 1 },
  },
  // **THE DURATION LADDER: ONE CAMERA, THREE STEPS, AND NOTHING ELSE MOVED.** M14's claim is
  // two-sided — the fuel stack shrinks and the fire's footprint does not — and a spatial claim
  // owes a frame rather than a dimension. Three shots at one pinned camera and one pinned
  // viewport are what makes the second half checkable: the stone ring and the ochre patch it
  // holds land in the SAME PIXELS in all three, so a reviewer flipping between them sees
  // whether anything but the wood and the flame moved. Framed wide enough to keep the warded
  // ground, plain snow and a building in shot, because the footprint is the subject here and a
  // crop of the hearth would be a picture of the one thing nobody doubted.
  ...([FUEL_STEPS, 2, 1] as const).map((roundsLeft, i) => ({
    name: `08${"abc"[i]}-fire-duration-${roundsLeft}-rounds-left-1024x580`,
    winter: true,
    polar: VILLAGE_CAMERA.polarAngle,
    distance: LAYOUT.cameraDistance * 0.22,
    viewport: SHORT,
    target: FIRE_AT,
    roundsLeft,
  })),
  // **THE SAME LADDER AT THE PLATES' TILT, AND WHAT IT SETTLED.** §4 puts the duration in the
  // FUEL and plate 08 draws a stack burning down, at the ~16° the whole reference set was drawn
  // at. Taken at both tilts, THE STACK IS NOT VISIBLE AT EITHER: from above the flame and the
  // ember skirt fill the ring's mouth, and from the side the ring stones stand 0.71-1.07 of the
  // hearth radius tall against a stack whose top is 0.545, so they hide it. So the fuel is the
  // MECHANISM and the flame's height is the read — see the duration section of `winterFire.ts`.
  // This pair stays in the set as the frames that establish that, on the same argument shot 03
  // is here for: a plate drawn at 16° is not evidence about a game locked at 49°.
  ...([FUEL_STEPS, 1] as const).map((roundsLeft, i) => ({
    name: `09${"ab"[i]}-fire-duration-${roundsLeft}-rounds-left-16deg-1024x580`,
    winter: true,
    polar: PLATE_POLAR,
    distance: LAYOUT.cameraDistance * 0.22,
    viewport: SHORT,
    target: FIRE_AT,
    roundsLeft,
  })),
];

/**
 * The one assertion that runs unconditionally, so the file is never empty and the set it
 * describes cannot quietly lose the comparison that is its whole point: the SAME scene at the
 * game's tilt and at the plates'. A shot list with one tilt in it would photograph four views
 * and answer nothing.
 */
test("photographs the crisis at the game's tilt and at the plates', for comparison", () => {
  expect(SHOTS.length).toBeGreaterThanOrEqual(4);
  const tilts = new Set(SHOTS.filter((s) => s.winter).map((s) => s.polar.toFixed(4)));
  expect(
    tilts.size,
    "the set has to hold both tilts to be a comparison",
  ).toBeGreaterThanOrEqual(2);
  expect(tilts).toContain(VILLAGE_CAMERA.polarAngle.toFixed(4));
  expect(tilts).toContain(PLATE_POLAR.toFixed(4));
  // ...and a fair-weather plate to read the winter against, and a zoom-out where the fog
  // decision is visible.
  expect(SHOTS.some((s) => !s.winter)).toBe(true);
  expect(
    SHOTS.some((s) => s.distance > LAYOUT.cameraDistance * 2),
    "one shot has to be at full zoom-out",
  ).toBe(true);
  // ...and the set holds the SHORT window, because that is the screen this work is reviewed
  // on. A tall developer window has hidden a real defect on this surface twice.
  const short = SHOTS.filter((s) => s.viewport === SHORT);
  expect(
    short.length,
    "the set has to hold the lead's own viewport",
  ).toBeGreaterThanOrEqual(2);
  expect(SHORT.height).toBeLessThan(SHOT.height * 0.8);
  // ...and those shots are CLOSE and aimed at something, since their job is to judge an
  // asset's own read rather than the island's.
  for (const s of short) {
    expect(s.distance, s.name).toBeLessThan(LAYOUT.cameraDistance * 0.7);
    expect(s.target, s.name).toBeDefined();
  }
  // ...and one of them photographs the board MID-SELECTION, which is a state none of the
  // others can reach: every other shot is of a board with no preview asked for, so the
  // candidate ground a player actually chooses on appears in exactly this one.
  const aiming = SHOTS.filter((s) => s.aimAt !== undefined);
  expect(aiming.length, "the set has to hold a candidate shot").toBeGreaterThanOrEqual(1);
  for (const s of aiming) {
    expect(s.viewport, s.name).toBe(SHORT);
  }
  // ...and the DURATION ladder is a set that differs in `rounds_left` and in nothing else. That
  // is what makes the three frames evidence for M14's second half — "the footprint does not
  // move" — rather than three pictures of a fire. A camera that drifted between them would let
  // a moved footprint pass as a moved viewpoint, so the sameness is asserted here instead of
  // being left to whoever writes the next shot.
  const duration = SHOTS.filter((s) => s.roundsLeft !== undefined);
  const ladder = duration.filter((s) => s.polar === VILLAGE_CAMERA.polarAngle);
  expect(ladder.length, "the ladder needs every step the tuning has").toBe(FUEL_STEPS);
  expect(new Set(ladder.map((s) => s.roundsLeft)).size, "one shot per step").toBe(
    FUEL_STEPS,
  );
  expect(Math.min(...ladder.map((s) => s.roundsLeft as number))).toBe(1);
  expect(Math.max(...ladder.map((s) => s.roundsLeft as number))).toBe(FUEL_STEPS);
  for (const s of duration) {
    const [first] = duration.filter((p) => p.polar === s.polar);
    expect(s.viewport, s.name).toBe(SHORT);
    expect(s.distance, `${s.name} camera distance`).toBe(first?.distance);
    expect(s.target, `${s.name} camera target`).toBe(first?.target);
    expect(s.aimAt, `${s.name} must not also be mid-selection`).toBeUndefined();
  }
  // ...and the set reaches the PLATES' tilt at both ends of the ladder as well. §4 asks for the
  // duration in the fuel and plate 08 draws it there, so a duration set shot only at the game's
  // own tilt could not tell a stack that is hidden from a stack that is not drawn. Both ends,
  // because one frame of an occluded stack says nothing about whether it MOVES.
  const atPlateTilt = duration.filter((s) => s.polar === PLATE_POLAR);
  expect(
    atPlateTilt.length,
    "the fuel's own step needs the tilt it is visible at, at both ends",
  ).toBeGreaterThanOrEqual(2);
  expect(new Set(atPlateTilt.map((s) => s.roundsLeft))).toEqual(new Set([1, FUEL_STEPS]));
});

test.runIf(ENABLED).each(SHOTS)("photographs the island: %s", async (shot) => {
  const { rows, fires, ruined } = board(shot.aimAt ?? null, shot.roundsLeft ?? null);
  const env = cityEnvironment("day", shot.winter);
  const view = shot.viewport ?? SHOT;
  const at = shot.target ?? ([0, 0, 0] as const);
  const offset = cameraAt(-Math.PI * 0.28, shot.polar, shot.distance);
  let gl: THREE.WebGLRenderer | null = null;
  await page.viewport(view.width, view.height);

  h = mount(
    <div style={{ width: view.width, height: view.height }}>
      <Canvas
        shadows
        dpr={1}
        camera={{
          position: [offset[0] + at[0], offset[1] + at[1], offset[2] + at[2]],
          fov: 32,
          near: VILLAGE_CAMERA.nearPlane,
          far: ISLAND_GRASS_RADIUS * VILLAGE_CAMERA.farPlaneRatio,
        }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          state.gl.toneMapping = THREE.ACESFilmicToneMapping;
          state.gl.toneMappingExposure = shot.winter ? WINTER_LIGHT.exposure : 1;
          state.camera.lookAt(at[0], at[1] + 2, at[2]);
          gl = state.gl;
        }}
      >
        <color attach="background" args={[env.background]} />
        <fog
          attach="fog"
          args={[
            env.fog,
            ISLAND_GRASS_RADIUS * (shot.winter ? WINTER_LIGHT.fog.nearRatio : 3),
            ISLAND_GRASS_RADIUS * (shot.winter ? WINTER_LIGHT.fog.farRatio : 20),
          ]}
        />
        <CityLighting
          islandRadius={ISLAND_GRASS_RADIUS}
          variant="day"
          winter={shot.winter}
        />
        <StarterIsland layout={LAYOUT} reducedMotion />
        {shot.winter && (
          <WinterGround
            rows={rows}
            fires={fires}
            firePreviewAt={shot.aimAt ?? null}
            roadCells={ROADS}
            reducedMotion
          />
        )}
        <Roads roads={ROADS} eraId={CURRENT_ERA_ID} />
        {PLACED.map((p) => {
          const model = resolveBuildingModel(p.nodeId, "built");
          return model ? (
            <PlacedBuilding
              key={p.nodeId}
              nodeId={p.nodeId}
              center={transformCenter(p, footprintFor(p.nodeId))}
              rotationY={rotationYFor(p.rot)}
              footprint={footprintFor(p.nodeId)}
              model={model}
              mastery={0}
              reducedMotion
              celebrateToken={0}
              ruined={ruined.has(p.nodeId)}
              winter={shot.winter}
              onSelect={() => undefined}
            />
          ) : null;
        })}
        <TownHall
          center={transformCenter({ col: -1, row: -1, rot: 0 }, footprintFor(TOWN_HALL_ID))}
          rotationY={0}
          footprint={footprintFor(TOWN_HALL_ID)}
          model={resolveTownHallModel("built")}
          reducedMotion
          celebrateToken={0}
          winter={shot.winter}
          onSelect={() => undefined}
        />
      </Canvas>
    </div>,
  );

  await waitFor(() => gl !== null, "the canvas never created", 20000);
  const renderer = gl as unknown as THREE.WebGLRenderer;
  // The GLBs load behind their own Suspense boundaries, so the shot has to wait for the whole
  // settlement rather than for the first frame — otherwise a photograph of the bare island
  // would satisfy every assertion here.
  await waitFor(
    () => renderer.info.render.triangles > 40000,
    "the settlement never finished loading",
    30000,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 900));

  if (ENABLED) {
    const written = await page.screenshot({
      path: `__screenshots__/winter-crisis/${shot.name}.png`,
    });
    expect(written, `no screenshot was written for ${shot.name}`).toBeTruthy();
  }
  // And it photographed a scene, not a blank canvas: the triangle count is what the renderer
  // last submitted, so a shot taken over a torn-down canvas is a zero here.
  expect(renderer.info.render.triangles, shot.name).toBeGreaterThan(40000);
});
