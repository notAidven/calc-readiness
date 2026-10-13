import { Canvas } from "@react-three/fiber";
import type * as THREE from "three";
import { afterEach, expect, test } from "vitest";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { eraCityLayout } from "../islandLand";
import { CityLighting } from "./CityLighting";
import { StarterIsland } from "./StarterIsland";

/**
 * The island is static scenery, but before batching it submits one draw per pebble,
 * reed, grass clump and terrain patch. At the shipped 1024×580 learner surface that
 * contributes hundreds of calls to every frame, including every frame where the
 * learner is only reading the DOM.
 *
 * The constrained whole-session reproduction is committed at
 * `output/memory/overnight-{dev,prod}-before.json`: production idle submits 107,648
 * draw calls in one sample window, with RAF p95 150ms and 64/64 delayed frames at 4×
 * CPU throttling. This guard isolates the static island from buildings and citizens
 * so a future busy city cannot disguise that cost.
 */

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** A floor proving the canvas rendered the island rather than an empty scene. */
const MIN_TRIANGLES = 5_000;

/**
 * Room for the terrain's distinct opaque treatments plus the deliberately unbatched
 * transparent water/grid and articulated birds. This is still less than one quarter
 * of the pre-fix island's calls.
 */
const MAX_ISLAND_DRAW_CALLS = 120;

test("the static island does not submit one draw call per decorative mesh", async () => {
  const layout = eraCityLayout("prehistoric");
  let gl: THREE.WebGLRenderer | null = null;

  h = mount(
    <div style={{ width: 1024, height: 580 }}>
      <Canvas
        shadows
        dpr={1}
        camera={{ position: [0, 62, 62], fov: 40 }}
        onCreated={(state) => {
          gl = state.gl;
        }}
      >
        <CityLighting islandRadius={layout.islandRadius} variant="day" />
        <StarterIsland layout={layout} reducedMotion eraId="prehistoric" />
      </Canvas>
    </div>,
  );

  await waitFor(() => gl !== null, "the canvas never created", 10_000);
  const renderer = gl as unknown as THREE.WebGLRenderer;
  await waitFor(
    () => renderer.info.render.triangles >= MIN_TRIANGLES,
    "the island never submitted enough geometry to prove it rendered",
    10_000,
  );

  expect(
    renderer.info.render.calls,
    `the static island submitted ${renderer.info.render.calls} calls; ` +
      "decorative meshes were not batched by compatible material",
  ).toBeLessThanOrEqual(MAX_ISLAND_DRAW_CALLS);
}, 30_000);
