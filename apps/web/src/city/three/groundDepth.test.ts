import { describe, expect, it } from "vitest";
import { eraCityLayout } from "../islandLand";
import { SURFACE_Y } from "../worldLayout";
import { depthResolutionAt, maxViewDistance, VILLAGE_CAMERA } from "./orbitCamera";
import { decalBias, GROUND_DECAL_BIAS_CYCLE, GROUND_DECAL_TOPS } from "./StarterIsland";

/**
 * The island's GROUND-DECAL ladder vs. the camera's depth range — the sibling of
 * `depthPrecision.test.ts`, which pins the same arithmetic for the road stack.
 *
 * THE BUG THIS PINS: era one's re-skin gave every flat thing lying on the island its own
 * ad-hoc height, and several of them collided. The worn bare earth and the footpaths both
 * sat 0.045 above the ground and overlap each other by design, and the hearth's ash bed
 * sat 0.005 above them. At the furthest the camera can get, one resolvable depth step is
 * a few thousandths of a world unit — so a 0.005 gap is about one step and an identical
 * height is none, and which surface won was decided per pixel per frame. Evan saw it as
 * flickering in the island's details, and it is the same defect #152 fixed for the roads.
 *
 * The flicker itself needs a GPU and cannot be unit-tested. The geometry that produces it
 * is pure arithmetic, so the MARGIN is pinned here: if anyone adds a decal between the
 * rungs, narrows the step, or widens the camera's worst-case view, this fails instead of
 * the artifact quietly returning.
 *
 * Separate from the road test on purpose. That one guards `ROAD_SURFACE_TOPS` and is the
 * regression test for #152; a ground-decal regression should name itself rather than
 * arrive as a mysterious failure in the road file.
 */

const layout = eraCityLayout("prehistoric");

const NEAR = VILLAGE_CAMERA.nearPlane;
const FAR = layout.islandRadius * VILLAGE_CAMERA.farPlaneRatio;

/** Keep the pan target inside this fraction of the island (mirrors `CityScene`). */
const PAN_BOUND_RATIO = 0.72;

/** The same worst case the road test measures: both elastic edges folded in. */
const FURTHEST = maxViewDistance(
  layout.cameraDistance * (1 + VILLAGE_CAMERA.zoomOverscrollRatio),
  layout.seaRadius,
  layout.islandRadius * PAN_BOUND_RATIO * (1 + VILLAGE_CAMERA.panOverscrollRatio),
);

/**
 * Every surface the island's flat detail can present, lowest first, as a height above
 * the ground it lies on. `SURFACE_Y` is in the list because the lowest decal has to
 * clear the tussock it is lying on, which is the pair that was worst.
 */
function groundSurfaces(): number[] {
  return [0, ...Object.values(GROUND_DECAL_TOPS)].sort((a, b) => a - b);
}

/** The tightest gap between any two surfaces that can overlap in plan. */
function tightestGap(): number {
  const tops = groundSurfaces();
  let tightest = Number.POSITIVE_INFINITY;
  for (let i = 1; i < tops.length; i += 1) {
    tightest = Math.min(tightest, (tops[i] ?? 0) - (tops[i - 1] ?? 0));
  }
  return tightest;
}

/** How many resolvable depth steps separate the closest pair at the furthest view. */
function headroom(near: number, far: number): number {
  return tightestGap() / depthResolutionAt(FURTHEST, near, far);
}

describe("depth precision — the island's ground decals must stay separable", () => {
  it("keeps every ground surface several depth steps apart at the furthest view", () => {
    // Same 4x bar the road stack is held to, and for the same reason: a real fragment's
    // depth is interpolated rather than exact, so 1x is not a safe margin.
    expect(headroom(NEAR, FAR)).toBeGreaterThan(4);
  });

  it("fails for the collisions the era-one re-skin shipped with", () => {
    // The two real pairs, as authored: worn earth and the footpaths at an IDENTICAL
    // 0.045, and the ash bed 0.005 above them. Zero steps and about one step.
    const step = depthResolutionAt(FURTHEST, NEAR, FAR);
    expect(0 / step).toBeLessThan(1);
    expect(0.005 / step).toBeLessThan(2);
  });

  it("holds the rungs to a UNIFORM step, so no decal can be squeezed between two", () => {
    const tops = groundSurfaces();
    const gaps = tops.slice(1).map((t, i) => t - (tops[i] ?? 0));
    for (const gap of gaps) {
      expect(gap).toBeCloseTo(gaps[0] ?? 0, 10);
    }
  });

  it("gives consecutive decals different depth biases", () => {
    // The rungs cannot separate decals that share one — a worn path is a run of lumps
    // that overlap by design, all on the `worn` rung — so the bias is what fixes which
    // one wins. Any two lumps close enough to overlap are consecutive in the sequence,
    // so consecutive values must differ, and the whole cycle must be distinct.
    for (let seq = 0; seq < 40; seq += 1) {
      expect(decalBias(seq)).not.toBe(decalBias(seq + 1));
    }
    const cycle = new Set(
      Array.from({ length: GROUND_DECAL_BIAS_CYCLE }, (_, i) => decalBias(i)),
    );
    expect(cycle.size).toBe(GROUND_DECAL_BIAS_CYCLE);
    // Negative pulls toward the camera; every value must be a real offset, never zero.
    for (const bias of cycle) {
      expect(bias).toBeLessThan(0);
    }
  });

  it("keeps the decals clear of the road stack's lowest surface", () => {
    // Roads live inside the buildable disc and decals outside radius 25, so they cannot
    // overlap in plan today — but the road stack's lowest course is the nearest thing
    // above, and a future decal that drifts up into it would z-fight for real.
    //
    // UNCHANGED by D-ERA30, deliberately. The road stack used to start at 0.11 (its
    // curb), leaving this bound a 0.01u sliver above the top decal — about 2.2 depth
    // steps. Roads now continue THIS ladder instead of running their own, so the lowest
    // course sits on the next free rung at 0.15 and the real clearance is a full step
    // (11 steps). The 0.11 bound is therefore stricter than the roads now require, and
    // it is left exactly where it shipped: it is a ceiling on DECALS, which is the thing
    // this file guards, and loosening it to track the roads would only license a decal
    // to drift upward for no reason. The road side of the same clearance is asserted
    // from the road tops in `depthPrecision.test.ts`.
    const highest = Math.max(...Object.values(GROUND_DECAL_TOPS));
    expect(SURFACE_Y + highest).toBeLessThan(SURFACE_Y + 0.11);
  });
});
