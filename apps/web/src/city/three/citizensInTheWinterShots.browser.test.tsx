import {
  type CitizenNodeInput,
  createHardWinter,
  deriveCitizenRoster,
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
  BUILDABLE_RADIUS,
  defaultPlacements,
  footprintFor,
  ISLAND_GRASS_RADIUS,
  type PlacedTransform,
  rotationYFor,
  transformCenter,
} from "../worldLayout";
import { Citizens } from "./Citizens";
import { CityLighting, cityEnvironment } from "./CityLighting";
import { shelterGround } from "./citizenShelter";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { PlacedBuilding } from "./PlacedBuilding";
import { StarterIsland } from "./StarterIsland";
import { TownHall } from "./TownHall";
import { WinterGround } from "./WinterGround";
import { WINTER_LIGHT } from "./winterTones";

/**
 * **WHAT THE CITY LOOKS LIKE WHILE ITS PEOPLE SHELTER, PHOTOGRAPHED.**
 *
 * `citizensInTheWinter.test.ts` measures the crowd — which cells it is on, how deep the knots
 * are, how far it keeps from the frost. Those are the claims a guard can hold and they are not
 * the deliverable: *"does the city read as frightened"* is a judgement about a rendered frame
 * and no measurement substitutes for it. **A layout test can assert the crowd is in six cells,
 * pass, and say nothing whatever about whether a person glancing at the island can tell
 * something is wrong.** So this writes PNGs for somebody to look at.
 *
 * ## THE VIEWPORT IS NAMED, AND IT IS THE SHORT ONE
 *
 * Every frame is **1024x580**, the lead's own window. A comfortable developer viewport has
 * hidden real defects on this surface repeatedly, and it flatters this change in a specific
 * way: the crowd is the smallest thing on the island, so a tall window's extra pixels are
 * exactly the pixels that would make a huddle legible when it is not.
 *
 * ## THE PAIRS SHARE A CAMERA, WHICH IS WHAT MAKES THEM A COMPARISON
 *
 * Fair weather and the same city mid-crisis are shot from the SAME position at the SAME
 * distance, so a reviewer flipping between them sees the frost arrive and the crowd move and
 * nothing else. A camera that drifted between two frames would let a crowd that had not moved
 * pass as a crowd that had.
 *
 * The crisis panel is deliberately absent and the camera is pinned here rather than taken from
 * `CityScene`'s `winterFraming`: the subject is the ISLAND, and the game's own crisis framing
 * re-zooms to leave room for a panel that would cover the bottom half of a short window.
 * `winterIslandVisible.browser.test.tsx` set the precedent of photographing the canvas layer
 * with the crisis mount out of the way, for the same reason.
 *
 * ## EVERY FRAME IS UNDER `reducedMotion`
 *
 * Two reasons, and the second is the interesting one. The island's gulls produce up to 0.88%
 * whole-frame noise, which is enough to hollow out a frame comparison. And the crisis posture
 * is applied at SEATING time precisely so that the reduced-motion frame is already crouched —
 * so a set of stills under the preference is the case most at risk of reading as an ordinary
 * upright crowd, and photographing it under the preference is what checks that it does not.
 *
 * ## IT IS OFF BY DEFAULT, AND THAT IS MEASURED RATHER THAN CAUTIOUS
 *
 * Run `VITE_WINTER_SHOTS=1 npm run test:browser` to regenerate the set.
 *
 * `winterCrisisShots.browser.test.tsx` records what leaving a set of shadow-mapped GLB scenes
 * enabled does: it does not fail, it makes something ELSE fail, in a different file each run,
 * by starving an animation-timing assertion of frames. This file is the same shape and takes
 * the same gate. What runs unconditionally is the shot list's own structure, which mounts
 * nothing.
 *
 * ## WHAT THE SET FOUND, so the next reader knows these frames earn their keep
 *
 * Two defects, neither of which any assertion in `citizensInTheWinter.test.ts` was able to see.
 *
 *  1. **A REAL ONE.** The first version of the allocator ranked "off the ground the frost takes
 *     tonight" above "near your own wall", and the Dwellings — 26 of the island's 44 homes —
 *     photographed with an EMPTY plot while the whole crowd had migrated inland. Every layout
 *     assertion was green: the crowd was in six cells at eight deep, off the ice, closer to the
 *     island's heart, all true and all compatible with a picture nobody would ship.
 *     `EXPOSED_STEP_UNITS` is the fix and carries the measurement.
 *  2. **A FRAMING ONE, in this file.** The pair was first aimed at the Dwellings' geometric
 *     centre and came back empty as well — the crowd was standing three metres south of the
 *     frame's bottom edge. At the shipped ~49° tilt the camera looks down +Z, so ground south of
 *     the target falls off the bottom; and the knots form on the south aprons precisely because
 *     the frost's first band is the shoreline. A frame is only evidence about what it contains,
 *     and "empty plot" and "cropped crowd" look identical from outside it.
 */

/** Set `VITE_WINTER_SHOTS=1` to regenerate the photographs; CI does not, see the header. */
const ENABLED = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's actual window. Short, which is the screen this work is reviewed on. */
const HIS_WINDOW = { width: 1024, height: 580 } as const;

const LAYOUT = eraCityLayout("prehistoric");

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

function playRound(winter: HardWinterState, action: WinterAction): HardWinterState {
  let next = hardWinterReducer(winter, { type: "declare", action });
  next = hardWinterReducer(next, { type: "resolve", correct: 2, asked: 3 });
  return hardWinterReducer(next, { type: "end_round" });
}

/** The board after `rounds` closed rounds in which the frost was never opposed. */
function board(rounds: number): {
  rows: ReturnType<typeof hardWinterView>["rows"];
  fires: readonly WinterFire[];
  frozen: number;
} {
  let winter = createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: CITY.map((p) => ({ node_id: p.nodeId, col: p.col, row: p.row })),
  });
  for (let round = 0; round < rounds; round += 1) {
    winter = playRound(winter, { kind: "reinforce", node_id: "NUM.5" });
  }
  const view = hardWinterView(winter);
  return { rows: view.rows, fires: winter.fires, frozen: view.frozen_cells };
}

interface Shot {
  readonly name: string;
  /** Closed rounds of frost, or `null` for the city before the crisis. */
  readonly rounds: number | null;
  /** Camera distance as a share of the default framing. Paired shots share it. */
  readonly zoom: number;
  /** What the camera looks at, on the ground plane. Paired shots share it. */
  readonly target: readonly [number, number];
}

/**
 * The settlement's own middle, so the close pair looks at buildings and people.
 *
 * Nudged SOUTH of the geometric centre, and that is a correction rather than taste. At the
 * shipped ~49° tilt the camera looks down the +Z axis, so ground to the south of the target
 * falls toward the bottom edge and off it — and the crowd's knots sit on the south aprons of
 * their buildings on this board, because the frost's first band is the shoreline and the lee
 * side of a building is the side away from it. The first version of this pair aimed at the
 * geometric centre and cropped the largest knot on the island out of frame, which is how a
 * frame comes back showing an empty plot over a crowd that is standing right there.
 */
const SETTLEMENT: readonly [number, number] = [0, 3];

/**
 * The Dwellings' south apron — 26 of the island's 44 homes shelter here, so it holds the largest
 * single knot in the settlement. The tightest pair is aimed at it so a POSTURE is judgeable
 * rather than inferred.
 *
 * Aimed at the GROUND the crowd stands on rather than at the building's centre, for the reason
 * above, and still framed wide enough to hold the plot, the snow and a neighbour: a crop of the
 * crowd would be a picture of the one thing nobody doubts, and the question is what the surface
 * around them looks like.
 */
const DWELLINGS_APRON = (() => {
  const placed = CITY.find((p) => p.nodeId === "NUM.2");
  if (!placed) {
    throw new Error("the Dwellings are not on this island, so there is nothing to aim at");
  }
  const centre = transformCenter(placed, footprintFor("NUM.2"));
  return [centre.x - 2, centre.z + 4] as const;
})();

const SHOTS: readonly Shot[] = [
  // THE GLANCE PAIR: the whole island at the game's own framing. This is the frame the claim
  // "a player glancing at the island can tell something is wrong" is actually about.
  { name: "01-before-the-crisis-whole-island", rounds: null, zoom: 1, target: [0, 0] },
  { name: "02-frost-on-the-shoreline-whole-island", rounds: 1, zoom: 1, target: [0, 0] },
  { name: "03-frost-halfway-in-whole-island", rounds: 2, zoom: 1, target: [0, 0] },
  // THE CLOSE PAIR: near enough that a reviewer can see a posture rather than infer one, and
  // framed on the SETTLEMENT rather than cropped to a citizen — the question is what the
  // surface around them looks like, and a crop of the figure is a picture of the one thing
  // nobody doubted.
  {
    name: "04-before-the-crisis-settlement",
    rounds: null,
    zoom: 0.5,
    target: SETTLEMENT,
  },
  {
    name: "05-frost-on-the-shoreline-settlement",
    rounds: 1,
    zoom: 0.5,
    target: SETTLEMENT,
  },
  { name: "06-frost-halfway-in-settlement", rounds: 2, zoom: 0.5, target: SETTLEMENT },
  // THE POSTURE PAIR: close enough on one shelter that a reviewer can see whether a figure is
  // crouched and whether a knot is a knot. Held to the same rule as the pair above — the plot,
  // the ground and a neighbour stay in frame — because the claim is about what the crowd looks
  // like ON this surface.
  {
    name: "07-before-the-crisis-at-the-dwellings",
    rounds: null,
    zoom: 0.24,
    target: DWELLINGS_APRON,
  },
  {
    name: "08-frost-on-the-shoreline-at-the-dwellings",
    rounds: 1,
    zoom: 0.24,
    target: DWELLINGS_APRON,
  },
];

/**
 * The one assertion that runs unconditionally, so the file is never empty and the set it
 * describes cannot quietly lose the property that makes it evidence: the crisis frames have to
 * be PAIRED with a fair-weather frame at the same camera, or there is nothing to read them
 * against.
 */
test("photographs the city before the crisis and during it, from one camera", () => {
  expect(SHOTS.length).toBeGreaterThanOrEqual(4);
  // Both halves exist. A set of crisis frames alone would answer "is this a winter" and not
  // "did the city change".
  expect(SHOTS.some((shot) => shot.rounds === null)).toBe(true);
  expect(SHOTS.some((shot) => shot.rounds !== null)).toBe(true);

  // Every crisis frame has a fair-weather frame at its own camera. Asserted per shot rather
  // than as a count, because two frames at two cameras is not a comparison however many of
  // them there are.
  const cameraOf = (shot: Shot) => `${shot.zoom}@${shot.target.join(",")}`;
  const fairCameras = new Set(
    SHOTS.filter((shot) => shot.rounds === null).map((shot) => cameraOf(shot)),
  );
  expect(fairCameras.size).toBeGreaterThanOrEqual(2);
  for (const shot of SHOTS.filter((s) => s.rounds !== null)) {
    expect(fairCameras.has(cameraOf(shot)), `${shot.name} has no fair-weather twin`).toBe(
      true,
    );
  }

  // The set holds the whole island AND a close look, because the two answer different
  // questions: whether the change reads at a glance, and what it is that is reading.
  expect(SHOTS.some((shot) => shot.zoom >= 1)).toBe(true);
  expect(SHOTS.some((shot) => shot.zoom <= 0.5)).toBe(true);

  // And the frost is PARTWAY IN somewhere in the set, which is the state the whole change is
  // about — a board with nothing frozen shows no retreat, and a wholly frozen one shows the
  // endgame. Read off the engine rather than asserted about a round number.
  const partway = SHOTS.filter((shot) => shot.rounds !== null).map(
    (shot) => board(shot.rounds as number).frozen,
  );
  expect(partway.some((frozen) => frozen > 0 && frozen < 88)).toBe(true);
  expect(Math.max(...partway)).toBeGreaterThanOrEqual(52);

  // Every frame is at the lead's window and under the preference. Both are properties of the
  // MOUNT below rather than of this list, so they are pinned here as constants a reader can
  // check against it: 1024x580, and `reducedMotion` on every component that takes it.
  expect(HIS_WINDOW).toEqual({ width: 1024, height: 580 });
});

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

/**
 * **THE VIEWPORT IS ONLY TOUCHED WHEN THE SHOTS ARE ACTUALLY TAKEN, and the guard is not
 * defensive tidiness — it is a red this file caused.**
 *
 * `page.viewport` resizes the whole browser page, which is shared by every file the worker runs
 * after this one. An unconditional `afterAll` restore looks like a no-op and is not: it sets the
 * page to the test IFRAME's inner size, which is smaller, and the next file inherits it.
 * Measured on the full browser suite with the shots off:
 * `labelFigureNarrow.browser.test.tsx` failed at *"the in-city lesson window, desktop"* with a
 * lesson figure 791.2px wide against the 920 it is pinned to — a reading-width assertion in
 * another lane, red because of a viewport call in a citizens file that had skipped all of its
 * own tests. `winterCrisisShots.browser.test.tsx` gates the same pair the same way.
 */
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

/** Where the village camera sits at the default heading, `distance` out. */
function cameraAt(distance: number): [number, number, number] {
  const azimuth = -Math.PI * 0.28;
  const polar = VILLAGE_CAMERA.polarAngle;
  return [
    Math.sin(polar) * Math.sin(azimuth) * distance,
    Math.cos(polar) * distance + 2,
    Math.sin(polar) * Math.cos(azimuth) * distance,
  ];
}

test.runIf(ENABLED).each(SHOTS)("photographs the island: %s", async (shot) => {
  const winter = shot.rounds === null ? null : board(shot.rounds);
  const shelter = shelterGround(winter?.rows ?? null);
  const env = cityEnvironment("day", winter !== null);
  const at = shot.target;
  const offset = cameraAt(LAYOUT.cameraDistance * shot.zoom);
  let gl: THREE.WebGLRenderer | null = null;
  await page.viewport(HIS_WINDOW.width, HIS_WINDOW.height);

  h = mount(
    <div style={{ width: HIS_WINDOW.width, height: HIS_WINDOW.height }}>
      <Canvas
        shadows
        dpr={1}
        camera={{
          position: [offset[0] + at[0], offset[1], offset[2] + at[1]],
          fov: 32,
          near: VILLAGE_CAMERA.nearPlane,
          far: ISLAND_GRASS_RADIUS * VILLAGE_CAMERA.farPlaneRatio,
        }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          state.gl.toneMapping = THREE.ACESFilmicToneMapping;
          state.gl.toneMappingExposure = winter ? WINTER_LIGHT.exposure : 1;
          state.camera.lookAt(at[0], 2, at[1]);
          gl = state.gl;
        }}
      >
        <color attach="background" args={[env.background]} />
        <fog
          attach="fog"
          args={[
            env.fog,
            ISLAND_GRASS_RADIUS * (winter ? WINTER_LIGHT.fog.nearRatio : 3),
            ISLAND_GRASS_RADIUS * (winter ? WINTER_LIGHT.fog.farRatio : 20),
          ]}
        />
        <CityLighting
          islandRadius={ISLAND_GRASS_RADIUS}
          variant="day"
          winter={winter !== null}
        />
        <StarterIsland layout={LAYOUT} reducedMotion />
        {winter && <WinterGround rows={winter.rows} fires={winter.fires} reducedMotion />}
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
              winter={winter !== null}
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
          winter={winter !== null}
          onSelect={() => undefined}
        />
        <Citizens
          roster={ROSTER}
          placements={CITY}
          hub={HUB}
          seed={0x570e}
          eraId={CURRENT_ERA_ID}
          shelter={shelter}
          reducedMotion
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
      path: `__screenshots__/citizens-in-the-winter/${shot.name}.png`,
    });
    expect(written, `no screenshot was written for ${shot.name}`).toBeTruthy();
  }
  expect(renderer.info.render.triangles, shot.name).toBeGreaterThan(40000);
});
