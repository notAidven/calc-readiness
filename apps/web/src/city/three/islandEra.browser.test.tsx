import type { EraId } from "@cr/skill-graph";
import { Canvas } from "@react-three/fiber";
import type * as THREE from "three";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { CURRENT_ERA_ID } from "../eraDressing";
import { eraCityLayout } from "../islandLand";
import { CityLighting } from "./CityLighting";
import { ScarredGround } from "./ScarredGround";
import { StarterIsland } from "./StarterIsland";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * **THE ISLAND, ON A REAL GPU, IN TWO ERAS — and a scar on an otherwise normal one.**
 *
 * `islandEra.test.ts` proves the builder produces the right objects; it runs in node, where
 * nothing is ever drawn. This is the half only a real context can answer, and it is the half the
 * finding was actually about: **does an advance change what is on screen.** A per-era palette
 * that fails to reach a material, geometry gated out but still submitted, or a dressing that
 * differs in the table and not in the frame, all pass a node test and change nothing a player
 * can see.
 *
 * So this renders the island twice, samples both frames, and measures the difference. It also
 * photographs the two islands and the scarred one, because a demo-readiness finding is answered
 * by a picture.
 *
 * **The PNGs are deliberately NOT committed.** They land under `__screenshots__/`, which
 * `.gitignore` already excludes for the whole tree. Regenerate them with
 *
 *   npx vitest run --config vitest.browser.config.ts apps/web/src/city/three/islandEra.browser.test.tsx
 *
 * and read them out of `apps/web/src/city/three/__screenshots__/island-era/`.
 */

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * **ERA ONE'S ISLAND, NAMED — both frames below are of the same island in two dressings.**
 *
 * One radius is the right control for the question this file asks: *"does an advance change
 * what is on screen"* has to hold the island still or it is measuring the growth. What was
 * wrong was getting era one by OMISSION, through `computeCityLayout()`'s default (#521 removed
 * it), which made the later era's frame a photograph of an island the game does not draw for
 * it.
 *
 * The half this file therefore does not cover: whether an era's dressing reaches its OWN
 * island's shore. `islandDressingFillsTheIsland.test.ts` measures that off the scene graph and
 * `islandDressingReachesTheShore.browser.test.tsx` photographs it.
 */
const layout = eraCityLayout("prehistoric");
const VIEW = 520;

/**
 * **THE TWO BUDGETS HAVE TO BE ORDERED, and they were the wrong way round.**
 *
 * Each test below calls {@link frameOf} TWICE, and every call mounts its own WebGL context,
 * waits for the first draw, and reads a 520x520 frame back. Chromium caps how many live
 * contexts it will keep, so the second mount routinely costs a real teardown — "THREE.
 * WebGLRenderer: Context Lost" is printed on an ordinary passing run — and on a loaded
 * runner that is where the seconds go.
 *
 * The internal waits were 20s each while the tests declared no timeout, so they ran under
 * vitest's 15s default. That ordering is incoherent: two 20s waits cannot both be reachable
 * inside a 15s test, so a slow canvas could never produce its own diagnostic. That is what it
 * cost, measured rather than supposed: on `f59a9439` the push run's browser suite took 209.87s
 * against 46s locally, this test blew the 15s cap, and the failure it reported was an
 * anonymous "Test timed out in 15000ms" instead of naming which era's renderer had submitted
 * nothing. The same tree had passed the pull-request run minutes earlier.
 *
 * It was not confined to one lane either: the same 15000ms timeout fired on `integration`
 * itself (run 30641589487) and on two unrelated branches on 2026-07-31, blocking merges from
 * three lanes at once while passing locally in about 5s. A dev box gets a real GPU; the CI
 * runner has two cores, two Chromium workers and software rasterisation, so the frames take
 * much longer there and nothing about that is a fault to be fixed.
 *
 * So the inner budget is now well under the outer one. Two stalled canvases report at 20s
 * total inside a 60s test, which leaves the messages above reachable and gives the frames
 * real headroom on a runner four times slower than this one. **No assertion moved** — every
 * floor and the differing-pixel ratio are exactly as they were, and the internal waits still
 * fail loudly with their own messages if a context or a triangle never arrives.
 */
const CANVAS_WAIT_MS = 10000;
const SHOT_TEST_TIMEOUT_MS = 60000;

/** One frame of the island in a given era, as its raw RGBA bytes. */
async function frameOf(
  eraId: EraId,
  options: { scarCells?: readonly string[] } = {},
): Promise<{ data: Uint8ClampedArray; triangles: number }> {
  let gl: THREE.WebGLRenderer | null = null;
  h?.cleanup();
  h = mount(
    <div style={{ width: VIEW, height: VIEW }}>
      <Canvas
        // The game's own framing, near enough: high and oblique, with the whole island in
        // frame so the GROUND is most of what is sampled rather than the sky.
        camera={{ position: [0, 62, 62], fov: 40 }}
        // Kept so the frame can be READ BACK; without it the buffer is cleared between the
        // draw and the sample and every measurement below is of an empty canvas.
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          gl = state.gl;
        }}
      >
        <CityLighting islandRadius={layout.islandRadius} variant="day" />
        <StarterIsland layout={layout} reducedMotion eraId={eraId} />
        {options.scarCells && <ScarredGround cells={options.scarCells} />}
      </Canvas>
    </div>,
  );

  await waitFor(() => gl !== null, `the canvas never created for ${eraId}`, CANVAS_WAIT_MS);
  const renderer = gl as unknown as THREE.WebGLRenderer;
  await waitFor(
    () => renderer.info.render.triangles > 0,
    `the renderer submitted nothing for ${eraId}`,
    CANVAS_WAIT_MS,
  );

  const canvas = renderer.domElement;
  const sink = document.createElement("canvas");
  sink.width = canvas.width;
  sink.height = canvas.height;
  const ctx = sink.getContext("2d");
  if (!ctx) {
    throw new Error("no 2D context to sample the frame with");
  }
  ctx.drawImage(canvas, 0, 0);
  return {
    data: ctx.getImageData(0, 0, sink.width, sink.height).data,
    triangles: renderer.info.render.triangles,
  };
}

/** How many painted pixels differ between two frames, and how many were painted at all. */
function compare(
  a: Uint8ClampedArray,
  b: Uint8ClampedArray,
): { painted: number; differing: number } {
  let painted = 0;
  let differing = 0;
  for (let i = 0; i < a.length; i += 4) {
    const onA = (a[i + 3] ?? 0) > 8;
    const onB = (b[i + 3] ?? 0) > 8;
    if (onA || onB) {
      painted += 1;
    }
    if (
      onA !== onB ||
      Math.abs((a[i] ?? 0) - (b[i] ?? 0)) > 10 ||
      Math.abs((a[i + 1] ?? 0) - (b[i + 1] ?? 0)) > 10 ||
      Math.abs((a[i + 2] ?? 0) - (b[i + 2] ?? 0)) > 10
    ) {
      differing += 1;
    }
  }
  return { painted, differing };
}

async function shoot(name: string): Promise<void> {
  if (CAPTURE_EVIDENCE) {
    const path = await page.screenshot({ path: `__screenshots__/island-era/${name}.png` });
    expect(path, `no screenshot was written for ${name}`).toBeTruthy();
  }
}

test(
  "an era advance changes the island a player is looking at",
  async () => {
    const laterEra = "cyberpunk" satisfies EraId;

    const eraOne = await frameOf(CURRENT_ERA_ID);
    await shoot("era-1-prehistoric");
    const later = await frameOf(laterEra);
    await shoot(`era-authored-${laterEra}`);

    // FLOORS FIRST. Both frames drew a real island, so the difference below is between two
    // pictures rather than between two blank canvases — which is how a "they differ" assertion
    // passes over a broken renderer.
    expect(eraOne.triangles).toBeGreaterThan(1000);
    expect(later.triangles).toBeGreaterThan(1000);

    const { painted, differing } = compare(eraOne.data, later.data);
    expect(painted).toBeGreaterThan(40000);

    // THE ASSERTION THE WHOLE CHANGE IS FOR: the advance is visible. A tenth of the painted
    // frame is a low bar for "the ground changed colour and the camp came off" and a high one
    // for anything that could happen by accident — before the era axis existed this was 0.
    expect(differing / painted).toBeGreaterThan(0.1);

    // Both are substantial, independently-authored graphs rather than one palette swap.
    expect(later.triangles).not.toBe(eraOne.triangles);
  },
  SHOT_TEST_TIMEOUT_MS,
);

test(
  "a scar still reads on an otherwise normal island",
  async () => {
    // Four cells near the middle of the buildable flat, so the scar is unmistakably ON the
    // ground a player builds on rather than out at the margin.
    const scarCells = ["0,0", "1,0", "0,1", "-1,-1"];

    const clean = await frameOf(CURRENT_ERA_ID);
    const scarred = await frameOf(CURRENT_ERA_ID, { scarCells });
    await shoot("era-1-with-scars");

    const { painted, differing } = compare(clean.data, scarred.data);
    expect(painted).toBeGreaterThan(40000);

    // THE SCAR IS ON SCREEN. Four cells of a 22-radius island is a small share of the frame, so
    // the floor is small — but it is a floor, and a scar layer that rendered nothing gives 0.
    expect(differing).toBeGreaterThan(500);
    expect(scarred.triangles).toBeGreaterThan(clean.triangles);

    /*
     * ⚑ AND HERE IS THE DESIGN QUESTION, MEASURED RATHER THAN LEFT AS AN IMPRESSION.
     *
     * The instruction was to check whether a scar still reads as a scar once the winter dressing
     * is gone, and to SAY SO rather than fix it silently, because what a ruin looks like is a
     * design decision. So this measures the two properties that decide it: how dark the scarred
     * pixels are against the ground, and how uniform they are.
     *
     * They come out near-black and almost perfectly flat, which is what makes the shape read as
     * an absence of material — a hole, or an untextured surface — rather than as ground that was
     * damaged. `ScarredGround.tsx` says so about itself in two places: "PLACEHOLDER TONE — NOT A
     * DESIGN DECISION" and "PLACEHOLDER — REPLACE THIS WHOLE BODY". This is not a failure, so it
     * is not asserted as one; the numbers are pinned so the report has evidence behind it and so
     * that replacing the placeholder moves them.
     */
    const changed: number[] = [];
    for (let i = 0; i < clean.data.length; i += 4) {
      if (Math.abs((clean.data[i] ?? 0) - (scarred.data[i] ?? 0)) > 10) {
        changed.push(
          0.2126 * (scarred.data[i] ?? 0) +
            0.7152 * (scarred.data[i + 1] ?? 0) +
            0.0722 * (scarred.data[i + 2] ?? 0),
        );
      }
    }
    expect(changed.length).toBeGreaterThan(500);
    const mean = changed.reduce((sum, v) => sum + v, 0) / changed.length;
    const spread = Math.sqrt(
      changed.reduce((sum, v) => sum + (v - mean) ** 2, 0) / changed.length,
    );
    // Very dark: well below a mid grey, on a ground that is a vivid yellow-green.
    expect(mean).toBeLessThan(110);
    // And very flat: almost no internal variation, so there is no material in it to read.
    expect(spread).toBeLessThan(30);
  },
  SHOT_TEST_TIMEOUT_MS,
);
