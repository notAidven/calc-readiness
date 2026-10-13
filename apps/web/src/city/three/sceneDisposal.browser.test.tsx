import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import * as THREE from "three";
import { afterEach, beforeEach, expect, test } from "vitest";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { eraCityLayout } from "../islandLand";
import { CityLighting } from "./CityLighting";
import { StarterIsland } from "./StarterIsland";

/**
 * **A SURFACE THAT REBUILDS ITS SCENE MUST GIVE THE OLD ONE BACK.**
 *
 * `StarterIsland` builds its whole graph imperatively — several hundred meshes of
 * ground, shore, props and dressing — and hands the finished `THREE.Group` to the
 * renderer through `<primitive object={group} />`. **react-three-fiber never disposes a
 * `<primitive>`**, deliberately: the object was made outside the reconciler, so the
 * reconciler will not assume it owns it. That makes disposal the builder's job, and it
 * was nobody's.
 *
 * So every era advance built a fresh island and dropped the old one on the floor. The
 * meshes leave the scene and stop being drawn, but each geometry keeps its GPU buffers:
 * three releases those only from `BufferGeometry.dispose()`, and a geometry that is
 * merely unreachable is never disposed at all. `renderer.info.memory.geometries` counts
 * exactly this — bound and not yet disposed — so it is both the symptom and the meter.
 *
 * ## WHY THE ROUND TRIP, AND NOT SIMPLY "IT WENT UP"
 *
 * Advancing an era legitimately costs geometry, because a later era has more on the
 * island — so a rising count on the way out proves nothing at all. Going A → B → C → A
 * ends on the SAME island that was measured at A, so the count owes a return to where it
 * started, and anything still resident is retention with nothing to justify it.
 *
 * Measured on the shipped code before the fix, and re-measured after it; the numbers are
 * in the pull request. The whole-session harness
 * (`scripts/measure-client-memory.mjs`) shows the same defect at the scale a player
 * meets it: nine era advances and back took the renderer from 1291 geometries to 9033
 * while the drawn scene stayed at 752, and process RSS from 1147MB to 1565MB.
 *
 * ## THE TOLERANCE IS NOT A FUDGE FACTOR
 *
 * A frame is not deterministic to the geometry: three binds a geometry lazily on the
 * draw that first needs it, so two readings of the same era can differ by a handful
 * depending on what the frustum touched before the sample. The allowance is therefore a
 * small ABSOLUTE slack rather than a ratio — a ratio would grow with the scene and
 * quietly re-admit the defect on a bigger island.
 */

let h: Harness | null = null;
let restoreDispose: (() => void) | null = null;

const GUARD_INJECTION = import.meta.env.VITE_SCENE_DISPOSAL_GUARD_INJECT ?? "none";

beforeEach(() => {
  if (GUARD_INJECTION !== "retain") return;
  const dispose = THREE.BufferGeometry.prototype.dispose;
  THREE.BufferGeometry.prototype.dispose = () => {};
  restoreDispose = () => {
    THREE.BufferGeometry.prototype.dispose = dispose;
  };
});

afterEach(() => {
  h?.cleanup();
  h = null;
  restoreDispose?.();
  restoreDispose = null;
});

const VIEW = 320;
const WAIT_MS = 10_000;
const TEST_TIMEOUT_MS = 60_000;

/**
 * How many geometries the renderer may still hold above its own first reading of the
 * same scene. Slack for the lazily-bound handful described above, and far below the
 * one current colour-batched island costs. The fault injection
 * `VITE_SCENE_DISPOSAL_GUARD_INJECT=retain` suppresses `BufferGeometry.dispose()` and
 * must fail above this allowance.
 */
const RETENTION_SLACK = 8;

interface Probe {
  /** Swap the subject inside the SAME canvas, so both readings share one GL context. */
  show: (node: ReactNode) => void;
  geometries: () => number;
  settle: () => Promise<void>;
}

/**
 * One canvas for the whole case. The subject is re-rendered INTO IT rather than
 * remounted, because a remount would give each reading its own GL context and its own
 * `info.memory` counter, and the two would not be comparable at all — a remount is in
 * fact the one thing that WOULD hide this defect.
 */
async function canvasProbe(islandRadius: number, first: ReactNode): Promise<Probe> {
  let gl: THREE.WebGLRenderer | null = null;
  const frame = (node: ReactNode) => (
    <div style={{ width: VIEW, height: VIEW }}>
      <Canvas
        camera={{ position: [0, 62, 62], fov: 40 }}
        onCreated={(state) => {
          gl = state.gl;
        }}
      >
        <CityLighting islandRadius={islandRadius} variant="day" />
        {node}
      </Canvas>
    </div>
  );

  h = mount(frame(first));
  await waitFor(() => gl !== null, "the canvas never created", WAIT_MS);
  const renderer = gl as unknown as THREE.WebGLRenderer;
  // THE FLOOR. A canvas that drew nothing would satisfy the retention comparison below.
  // Kept on submitted triangles rather than a geometry-count minimum: batching is allowed to
  // reduce the latter. `VITE_SCENE_DISPOSAL_GUARD_INJECT=empty` proves this rejects emptiness.
  await waitFor(
    () => renderer.info.render.triangles > 0,
    "the renderer submitted nothing",
    WAIT_MS,
  );

  return {
    show: (node) => h?.root.render(frame(node)),
    geometries: () => renderer.info.memory.geometries,
    settle: async () => {
      // Several frames, because a geometry is bound on the draw that first needs it and
      // released on the disposal that follows the swap — one frame samples the middle.
      for (let i = 0; i < 10; i += 1) {
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    },
  };
}

test(
  "the island hands its geometry back when an era advance rebuilds it",
  async () => {
    const layout = eraCityLayout("prehistoric");
    const island = (eraId: "prehistoric" | "neolithic" | "bronze_age") =>
      GUARD_INJECTION === "empty" ? null : (
        <StarterIsland layout={layout} reducedMotion eraId={eraId} />
      );

    const probe = await canvasProbe(layout.islandRadius, island("prehistoric"));
    await probe.settle();
    const eraOne = probe.geometries();

    probe.show(island("neolithic"));
    await probe.settle();
    const eraTwo = probe.geometries();

    probe.show(island("bronze_age"));
    await probe.settle();
    const eraThree = probe.geometries();

    probe.show(island("prehistoric"));
    await probe.settle();
    const backToEraOne = probe.geometries();

    // THE ASSERTION THE FIX IS FOR. The scene is era one's again, so the renderer owes
    // era one's geometry count and not the sum of four islands.
    expect(
      backToEraOne,
      `four island builds left ${backToEraOne} geometries bound where the same island ` +
        `first cost ${eraOne} (the walk read ${eraTwo} then ${eraThree}); ` +
        "the rebuilt islands were never disposed",
    ).toBeLessThanOrEqual(eraOne + RETENTION_SLACK);
  },
  TEST_TIMEOUT_MS,
);
