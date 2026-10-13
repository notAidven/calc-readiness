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
import { afterEach, expect, test } from "vitest";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { CURRENT_ERA_ID } from "../eraDressing";
import { ISLAND_GRASS_RADIUS } from "../worldLayout";
import { CityLighting } from "./CityLighting";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { WinterGround } from "./WinterGround";
import { applyFrost } from "./winterFrost";
import { WINTER_LIGHT } from "./winterTones";

/**
 * **THE CRISIS SCENE ON A REAL GPU, AT THE REAL CAMERA.**
 *
 * Two things live here because nothing else can answer them.
 *
 * **1. The frost treatment's black-out.** `winterFrost.test.ts` proves the colour attribute is
 * present wherever `vertexColors` is on. That is a claim about a buffer. "Every frosted
 * building went black" is a claim about a FRAME — it is what the shader does with a missing
 * attribute — so the reproduction is written first, as pixels, and then the treatment is shown
 * not to do it.
 *
 * **2. The scene at the shipped camera, which is not the camera the design was drawn from.**
 * The reference plates behind the batch were drawn at roughly 16° of elevation. The real camera
 * is locked at `VILLAGE_CAMERA.polarAngle` (0.72 rad, 49°) with `fov: 32` and a free 360°
 * heading, and a vertical is far less prominent at 49° than at 16°. So the scene is rendered at
 * the real tilt, the real fov, the real default distance and eight headings, and the frame is
 * sampled at each one. `winterCamera.test.ts` owns the arithmetic half — how much of a vertical
 * the tilt actually costs — because that is measurable exactly and a pixel count is not.
 */

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** Where the village camera sits at `azimuth`, at its default framing. */
function villageCameraPosition(azimuth: number): [number, number, number] {
  const distance = ISLAND_GRASS_RADIUS * 2.3;
  const polar = VILLAGE_CAMERA.polarAngle;
  return [
    Math.sin(polar) * Math.sin(azimuth) * distance,
    Math.cos(polar) * distance + 2,
    Math.sin(polar) * Math.cos(azimuth) * distance,
  ];
}

function playRound(winter: HardWinterState, action: WinterAction): HardWinterState {
  let next = hardWinterReducer(winter, { type: "declare", action });
  next = hardWinterReducer(next, { type: "resolve", correct: 3, asked: 3 });
  return hardWinterReducer(next, { type: "end_round" });
}

/** A winter several rounds in, so there is frost, a frost line, held ground and a fire. */
function midWinter(): {
  rows: ReturnType<typeof hardWinterView>["rows"];
  fires: readonly WinterFire[];
} {
  let winter = createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: [
      { node_id: "NUM.S", col: 0, row: 0 },
      { node_id: "NUM.F", col: 2, row: -2 },
    ],
  });
  // Every round is a fire. A pull-back stood in the middle of this plan until 2026-08-02, when
  // the lead ruled the give-up-ground action out; the frame it painted is one state shorter and
  // its own coverage floors are what say so rather than this comment.
  while (winter.phase !== "ended") {
    winter = playRound(winter, { kind: "fire", col: 1, row: 0 });
  }
  return {
    rows: hardWinterView(winter, { fire_preview: null }).rows,
    fires: winter.fires,
  };
}

interface FrameStats {
  readonly painted: number;
  readonly meanLuminance: number;
  readonly nearBlack: number;
}

/** What actually landed on the canvas: coverage, mean brightness, and how much is near-black. */
function sampleFrame(canvas: HTMLCanvasElement): FrameStats {
  const sink = document.createElement("canvas");
  sink.width = canvas.width;
  sink.height = canvas.height;
  const ctx = sink.getContext("2d");
  if (!ctx) {
    throw new Error("no 2D context to sample the frame with");
  }
  ctx.drawImage(canvas, 0, 0);
  const { data } = ctx.getImageData(0, 0, sink.width, sink.height);
  let painted = 0;
  let sum = 0;
  let nearBlack = 0;
  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) <= 8) {
      continue;
    }
    painted += 1;
    const luminance =
      (0.2126 * (data[i] ?? 0) +
        0.7152 * (data[i + 1] ?? 0) +
        0.0722 * (data[i + 2] ?? 0)) /
      255;
    sum += luminance;
    if (luminance < 0.06) {
      nearBlack += 1;
    }
  }
  return {
    painted,
    meanLuminance: painted === 0 ? 0 : sum / painted,
    nearBlack,
  };
}

/** A mesh shaped exactly like every shipped GLB primitive: indexed, position/normal/uv. */
function glbShapedMesh(): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(6, 6, 6);
  expect(geometry.index).not.toBeNull();
  expect(geometry.getAttribute("color")).toBeUndefined();
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0xc98a5e, roughness: 0.9 }),
  );
}

test("vertexColors with no attribute renders BLACK, and the frost treatment does not", async () => {
  // THE REPRODUCTION FIRST. This is the defect: the batch's material config sets
  // `vertexColors = true`, no shipped GLB carries a `color` attribute, and three.js multiplies
  // the diffuse term by the (0,0,0) WebGL supplies for a missing one.
  const broken = glbShapedMesh();
  (broken.material as THREE.MeshStandardMaterial).vertexColors = true;
  (broken.material as THREE.MeshStandardMaterial).needsUpdate = true;

  const brokenStats = await renderOne(broken);
  // It painted — the mesh is there, the material compiled, nothing threw — and what it painted
  // is black. That combination is exactly why this could have shipped: every non-pixel
  // assertion about it passes.

  expect(brokenStats.painted).toBeGreaterThan(4000);
  expect(brokenStats.nearBlack / brokenStats.painted).toBeGreaterThan(0.9);

  h?.cleanup();
  h = null;

  // AND THE TREATMENT, on the same geometry, through the shipping path.
  const frosted = glbShapedMesh();
  expect(applyFrost(new THREE.Group().add(frosted))).toBe(1);
  expect((frosted.material as THREE.MeshStandardMaterial).vertexColors).toBe(true);

  const frostedStats = await renderOne(frosted);

  expect(frostedStats.painted).toBeGreaterThan(4000);
  // Pale, not black. The reproduction above is the floor this number has to clear.
  expect(frostedStats.nearBlack / frostedStats.painted).toBeLessThan(0.02);
  expect(frostedStats.meanLuminance).toBeGreaterThan(0.3);
});

/** Render one object under the winter rig and hand back what landed on the canvas. */
async function renderOne(object: THREE.Object3D): Promise<FrameStats> {
  let gl: THREE.WebGLRenderer | null = null;
  h = mount(
    <div style={{ width: 240, height: 240 }}>
      <Canvas
        camera={{ position: [10, 9, 10], fov: 32 }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          state.gl.toneMapping = THREE.ACESFilmicToneMapping;
          state.gl.toneMappingExposure = WINTER_LIGHT.exposure;
          gl = state.gl;
        }}
      >
        <CityLighting islandRadius={ISLAND_GRASS_RADIUS} variant="day" winter />
        <primitive object={object} />
      </Canvas>
    </div>,
  );
  await waitFor(() => gl !== null, "the canvas never created", 15000);
  const renderer = gl as unknown as THREE.WebGLRenderer;
  await waitFor(
    () => renderer.info.render.triangles > 0,
    "the renderer submitted no triangles",
    15000,
  );
  return sampleFrame(renderer.domElement);
}

test("the whole crisis scene reads at the real camera, from every heading", async () => {
  const { rows, fires } = midWinter();
  // Floors under everything below: a winter that never froze anything would make the frame
  // assertions vacuous.
  expect(rows.flat().filter((c) => c.frozen).length).toBeGreaterThan(20);
  expect(fires.length).toBeGreaterThan(0);

  let scene: THREE.Scene | null = null;
  let gl: THREE.WebGLRenderer | null = null;
  let camera: THREE.PerspectiveCamera | null = null;

  h = mount(
    <div style={{ width: 480, height: 480 }}>
      <Canvas
        // The REAL camera: the tilt `VILLAGE_CAMERA` locks, the fov `CityScene` sets, and the
        // default framing distance `computeCityLayout` derives.
        camera={{ position: villageCameraPosition(0), fov: 32, near: 4, far: 600 }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          state.gl.toneMapping = THREE.ACESFilmicToneMapping;
          state.gl.toneMappingExposure = WINTER_LIGHT.exposure;
          state.camera.lookAt(0, 2, 0);
          scene = state.scene;
          gl = state.gl;
          camera = state.camera as THREE.PerspectiveCamera;
        }}
      >
        <color attach="background" args={[`#${WINTER_LIGHT.sky.toString(16)}`]} />
        <fog
          attach="fog"
          args={[
            `#${WINTER_LIGHT.fog.color.toString(16)}`,
            ISLAND_GRASS_RADIUS * WINTER_LIGHT.fog.nearRatio,
            ISLAND_GRASS_RADIUS * WINTER_LIGHT.fog.farRatio,
          ]}
        />
        <CityLighting islandRadius={ISLAND_GRASS_RADIUS} variant="day" winter />
        <WinterGround rows={rows} fires={fires} roadCells={roadRun()} />
      </Canvas>
    </div>,
  );

  await waitFor(
    () => scene !== null && gl !== null && camera !== null,
    "the canvas never created",
    15000,
  );
  const liveScene = scene as unknown as THREE.Scene;
  const renderer = gl as unknown as THREE.WebGLRenderer;
  const cam = camera as unknown as THREE.PerspectiveCamera;

  await waitFor(
    () => renderer.info.render.triangles > 0,
    "the renderer submitted no triangles",
    15000,
  );

  // Every named asset reached the live scene through R3F's own reconciler, so a group somebody
  // built and never attached is a zero.
  for (const name of [
    "winter-snow-course",
    "winter-ice-sheet",
    "winter-cold-water",
    "winter-hearth",
    "winter-smoke-column",
    "winter-snowfall",
    "winter-trodden-path",
  ]) {
    let found = 0;
    liveScene.traverse((child) => {
      if (child.name === name) {
        found += 1;
      }
    });
    expect(found, name).toBeGreaterThan(0);
  }

  // AND IT READS FROM EVERY HEADING. The azimuth is free through a full 360°, so a scene that
  // only works from the default one is a scene that works nowhere.
  const perHeading: FrameStats[] = [];
  for (let i = 0; i < 8; i += 1) {
    const azimuth = (i / 8) * Math.PI * 2;
    cam.position.set(...villageCameraPosition(azimuth));
    cam.lookAt(0, 2, 0);
    cam.updateProjectionMatrix();
    renderer.render(liveScene, cam);
    const stats = sampleFrame(renderer.domElement);
    perHeading.push(stats);

    // The island fills most of a 480x480 frame at the default framing, so this floor cannot be
    // met by the fire and the outlines alone — which is what is left when the course goes NaN.
    expect(stats.painted, `heading ${i}`).toBeGreaterThan(120000);
    // DAYTIME, not night: the batch's own check is that the darkest lit face stays near 0.42.
    // A whole overcast frame including the dark cold water sits above 0.3 and below blown out.
    expect(stats.meanLuminance, `heading ${i}`).toBeGreaterThan(0.3);
    expect(stats.meanLuminance, `heading ${i}`).toBeLessThan(0.95);
    // And nothing went black, which is the failure mode the frost hazard would have produced
    // had it reached the ground course's own faceted material.
    expect(stats.nearBlack / stats.painted, `heading ${i}`).toBeLessThan(0.02);
  }

  // The scene is not merely non-empty from every heading, it is CONSISTENT from every heading:
  // a fixed snowfall volume, or an asset that only exists on one side, shows up as a spread in
  // coverage between the best and worst view.
  const painted = perHeading.map((s) => s.painted);
  expect(Math.min(...painted) / Math.max(...painted)).toBeGreaterThan(0.9);
});

/** A short run of committed road, so the trodden paths are in the frame. */
function roadRun(): { col: number; row: number }[] {
  return [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 2, row: 0 },
    { col: 2, row: 1 },
    { col: 2, row: 2 },
  ];
}
