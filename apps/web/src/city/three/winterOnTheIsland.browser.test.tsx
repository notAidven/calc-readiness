import {
  createHardWinter,
  type HardWinterState,
  hardWinterReducer,
  hardWinterView,
  type WinterFire,
} from "@cr/game";
import { Canvas } from "@react-three/fiber";
import type * as THREE from "three";
import { afterEach, expect, test } from "vitest";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { CURRENT_ERA_ID } from "../eraDressing";
import { WINTER_TILE_NAMES, WinterGround } from "./WinterGround";

/**
 * **THE WINTER, ON A REAL GPU.**
 *
 * `winterGround.test.ts` proves the layer BUILDS the right objects; it runs in node, where
 * nothing is ever drawn. That leaves the half of "does the frost show" that only a real
 * context can answer: materials that fail to compile, geometry with a NaN in it, or a layer
 * that lands somewhere the camera is not, all construct perfectly and render nothing.
 *
 * So this mounts the layer into a live `@react-three/fiber` canvas in Chromium and asks the
 * renderer what it actually drew. The two assertions are the two ways the crisis can be
 * invisible while every unit test stays green:
 *
 *  1. the meshes reach the LIVE scene graph, through R3F's own reconciler rather than as a
 *     group somebody built and never attached;
 *  2. the renderer rasterises them — `gl.info.render.triangles` counts what the draw calls
 *     actually submitted, so a material that failed to compile or geometry the frustum culls
 *     away is a zero here.
 *
 * The board is the engine's own projection, mid-winter, rather than a literal: a renderer
 * test over a hand-written view model can go on passing over rows the engine stopped
 * producing.
 */

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** A winter several rounds in, so there is frost, a frost line and a fire to draw. */
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
  for (let round = 0; round < 3; round += 1) {
    winter = playRound(winter, { kind: "fire", col: 1, row: 0 });
  }
  return {
    rows: hardWinterView(winter, { fire_preview: null }).rows,
    fires: winter.fires,
  };
}

/**
 * Declare, resolve at full marks, and let the frost move — one whole round, through the
 * shipped reducer rather than a re-implementation of what a round does.
 */
function playRound(
  winter: HardWinterState,
  action: { readonly kind: "fire"; readonly col: number; readonly row: number },
): HardWinterState {
  let next = hardWinterReducer(winter, { type: "declare", action });
  next = hardWinterReducer(next, { type: "resolve", correct: 3, asked: 3 });
  return hardWinterReducer(next, { type: "end_round" });
}

function namesIn(scene: THREE.Object3D, name: string): number {
  let found = 0;
  scene.traverse((child) => {
    if (child.name === name) {
      found += 1;
    }
  });
  return found;
}

test("the frost, the frost line and a fire all reach a live scene and are drawn", async () => {
  const { rows, fires } = midWinter();
  // A floor under everything below: a winter that never froze anything would make every
  // assertion here vacuous, and three rounds of spread is what puts frost on the board.
  const frozen = rows.flat().filter((c) => c.frozen);
  expect(frozen.length).toBeGreaterThan(5);
  const onTheLine = rows.flat().filter((c) => c.frost_line);
  expect(onTheLine.length).toBeGreaterThan(0);
  /*
   * **THE SHEET IS COUNTED WITHOUT THE LINE'S CELLS SINCE 2026-08-03.** `frost_line` is a
   * refinement of `frozen`, not a state beside it, and the layer used to draw a full-cell
   * surface for each — two stacked terrains per line cell, interleaving and showing through
   * each other (the lead's *"random interior weird icicles"*; `winterGroundOneFill.test.ts`).
   * A line cell now draws once, as the line, so the sheet's own count is the frozen cells that
   * are not on it. Derived from the same rows rather than repinned.
   */
  const sheet = frozen.filter((c) => !c.frost_line);
  expect(
    sheet.length,
    "every frozen cell is on the line, so the sheet is untested",
  ).toBeGreaterThan(5);
  expect(fires.length).toBeGreaterThan(0);

  let scene: THREE.Scene | null = null;
  let gl: THREE.WebGLRenderer | null = null;

  h = mount(
    <div style={{ width: 480, height: 480 }}>
      <Canvas
        camera={{ position: [40, 46, 40], fov: 35 }}
        // Kept so the frame can be READ back. Without it the buffer is cleared between the
        // draw and the sample, and the pixel assertion below would be measuring an empty
        // canvas whatever the scene contained.
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          scene = state.scene;
          gl = state.gl;
        }}
      >
        <ambientLight intensity={1} />
        <WinterGround rows={rows} fires={fires} />
      </Canvas>
    </div>,
  );

  await waitFor(() => scene !== null && gl !== null, "the canvas never created", 15000);
  const liveScene = scene as unknown as THREE.Scene;
  const renderer = gl as unknown as THREE.WebGLRenderer;

  // 1. THE MESHES ARE IN THE LIVE SCENE. Counted through the reconciler's own tree, so a
  //    group that was built and never attached is a zero.
  await waitFor(
    () => namesIn(liveScene, WINTER_TILE_NAMES.frozen) > 0,
    "no frost reached the scene",
    15000,
  );
  expect(namesIn(liveScene, WINTER_TILE_NAMES.frozen)).toBe(sheet.length);
  expect(namesIn(liveScene, WINTER_TILE_NAMES.frostLine)).toBe(onTheLine.length);
  expect(namesIn(liveScene, WINTER_TILE_NAMES.fire)).toBe(fires.length);

  // 2. THE RENDERER SUBMITTED THEM. A layer that is attached but invisible, on a hidden
  //    camera layer, or frustum-culled away, is a zero here while every count above passes.
  await waitFor(
    () => renderer.info.render.triangles > 0,
    "the renderer submitted no triangles",
    15000,
  );
  expect(renderer.info.render.calls).toBeGreaterThan(0);
  // Twelve triangles per slab: a frame that drew only the light rig cannot satisfy this.
  expect(renderer.info.render.triangles).toBeGreaterThan(12 * frozen.length);

  // 3. AND PIXELS CAME OUT. `info.render` counts what was submitted, not what landed, so it
  //    is satisfied by geometry that was drawn to nowhere — a NaN in a transform is the
  //    everyday way that happens, and it passes both assertions above. This samples the
  //    frame itself, which is the only assertion here that a demo audience would agree
  //    with.
  const painted = paintedPixels(renderer.domElement);
  // The frost mass alone covers a large part of a 480x480 view of this island, so a floor
  // in the thousands cannot be met by the fire and the outlines on their own — which is what
  // is left standing when the frost slabs go to NaN.
  expect(painted).toBeGreaterThan(20000);
});

/** How many pixels of the last frame were actually painted (the clear colour is alpha 0). */
function paintedPixels(canvas: HTMLCanvasElement): number {
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
  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 0) > 8) {
      painted += 1;
    }
  }
  return painted;
}
