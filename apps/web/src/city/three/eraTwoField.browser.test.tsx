import { Canvas } from "@react-three/fiber";
import type * as THREE from "three";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { eraCityLayout, eraLandRadius, eraSeaRadius } from "../islandLand";
import { CANVAS_WAIT_MS, framedTestBudget } from "../shotBudget";
import { computeCityLayout } from "../worldLayout";
import { CityLighting } from "./CityLighting";
import { StarterIsland } from "./StarterIsland";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * **ERA TWO'S AUTHORED MARGIN, CLOSE ENOUGH TO JUDGE — and era one in the same frame for control.**
 *
 * `islandEra.browser.test.tsx` photographs the whole island, which is the right frame for *is the
 * grey gone* and *does anything flicker at distance*. It is the wrong frame for judging a 2u plot:
 * in a 1024x580 in-game window the margin ring is a few dozen pixels of a 30u island, so a 0.04u
 * furrow ridge and a 0.6u stand of cereal are both sub-pixel guesses. Three attempts at cropping
 * the in-game frame proved that rather than argued it — one caught the buildable disc, one caught
 * the grid and the citizens, and the third was finally legible but still too small to settle
 * whether a pale disc was reading as a crop.
 *
 * So this puts the camera ON the margin, at the game's own fixed tilt, and shoots the same arc in
 * both eras. Era one is not decoration: its new authored graph also carries worn earth, boulders,
 * scrub and trees, so the control now proves a distinct renderer dispatch rather than a cheaper
 * procedural graph.
 *
 * **The PNGs are deliberately not committed** — they land under `__screenshots__/`, which
 * `.gitignore` excludes for the whole tree. Regenerate with
 *
 *   npx vitest run --config vitest.browser.config.ts apps/web/src/city/three/eraTwoField.browser.test.tsx
 *
 * and read them out of `apps/web/src/city/three/__screenshots__/era-two-field/`.
 */

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * **ERA TWO'S OWN ISLAND, and it used to be `computeCityLayout()` — era one's.**
 *
 * The no-argument call returns `ISLAND_GRASS_RADIUS`, so this file photographed era two's
 * field laid in era one's 2.8u margin ring while the island era two ships is drawn at grass
 * 38 with a 10.8u one. The pictures were true and they were of a container the game does not
 * have; `eraTwoGround.test.ts` carries the same correction and the cost it hid.
 */
const layout = computeCityLayout(eraLandRadius("neolithic"), eraSeaRadius("neolithic"));

/** Big enough to judge geometry on, which is the whole point of not using the in-game frame. */
const VIEW = { width: 900, height: 520 };

/**
 * **THE BUDGET IS PER FRAME, because the cost of this file is per frame.**
 *
 * This was a flat `GPU_BUDGET_MS = 60_000` on both tests, taken from
 * `islandEra.browser.test.tsx` — which is the right precedent and the wrong number, because
 * islandEra spends its 60s on TWO frames and the first test below spends it on EIGHT. On the
 * runner that test measured **66395ms** and was cut off at 60000, twice, and what it reported
 * was `locator.screenshot: Timeout 1150.0979999999981ms exceeded`: not a slow screenshot, but
 * the last crumb of the outer budget handed to the final shot. See `../shotBudget.ts`.
 *
 * So the budget is now derived from the frames each test actually takes, at islandEra's own
 * per-frame allowance. Adding an azimuth raises it; nobody has to remember to.
 */
const RING_FRAMES_PER_ARC = 2;
const WATER_FRAMES_PER_CAMERA = 2;

/**
 * A camera aimed OUTWARD at the margin from inside the island, at the village camera's own ~49°
 * elevation (14u up over 12.4u of ground reads 48.5°), so what is photographed is the ground at
 * the island's edge from the angle a player actually gets — not a plan view no camera can reach.
 *
 * Aiming it the other way, from outside the ring looking in, put the shore and the sea across half
 * the frame and the fields behind the camera. The ring runs from radius 25 to 35.8 and the island's
 * edge is at 38, so there is no room to stand outside it.
 *
 * The numbers moved with the layout above — the ring's middle is 30.4 on era two's island where it
 * was 26.4 on era one's — and the elevation is held: 15.8 up over 14.4 of ground is the same 48°.
 */
const RING_CAMERA = { inner: 16, height: 15.8, outer: 30.4, fov: 38 };

/**
 * FOUR ARCS ROUND THE RING, because one arc is not a sample of it.
 *
 * The plots cycle four states, so any single azimuth shows a quarter of what was authored — the
 * first frame taken here landed on an arc with no standing crop in it at all and read as evidence
 * that the crop had not been drawn. Twelve plots over four azimuths puts every state in shot.
 */
const RING_AZIMUTHS = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];

async function frameOf(
  eraId: "prehistoric" | "neolithic",
  azimuth: number,
): Promise<number> {
  const sin = Math.sin(azimuth);
  const cos = Math.cos(azimuth);
  return placedFrameOf(eraId, {
    name: "ring",
    position: [sin * RING_CAMERA.inner, RING_CAMERA.height, cos * RING_CAMERA.inner],
    target: [sin * RING_CAMERA.outer, 0, cos * RING_CAMERA.outer],
    fov: RING_CAMERA.fov,
  });
}

async function placedFrameOf(
  eraId: "prehistoric" | "neolithic",
  camera: PlacedCamera,
): Promise<number> {
  let gl: THREE.WebGLRenderer | null = null;
  h?.cleanup();
  // The page IS the canvas, so a full-page screenshot is a picture of the island and nothing else.
  await page.viewport(VIEW.width, VIEW.height);
  const position: [number, number, number] = [...camera.position] as [
    number,
    number,
    number,
  ];
  const target: [number, number, number] = [...camera.target] as [number, number, number];
  h = mount(
    <div style={{ width: VIEW.width, height: VIEW.height }}>
      <Canvas
        camera={{ position, fov: camera.fov }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          gl = state.gl;
          state.camera.lookAt(...target);
        }}
      >
        <CityLighting islandRadius={layout.islandRadius} variant="day" />
        <StarterIsland layout={layout} reducedMotion eraId={eraId} />
      </Canvas>
    </div>,
  );

  // The unsharded hosted browser suite can spend over 10s scheduling a WebGL context while
  // another worker paints whole-frame evidence. Keep the named failure, but leave enough of
  // the outer framed budget for both era renders to start under that measured load.
  const canvasWait = CANVAS_WAIT_MS * 3;
  await waitFor(() => gl !== null, `the canvas never created for ${eraId}`, canvasWait);
  const renderer = gl as unknown as THREE.WebGLRenderer;
  await waitFor(
    () => renderer.info.render.triangles > 0,
    `the renderer submitted nothing for ${eraId}`,
    canvasWait,
  );
  return renderer.info.render.triangles;
}

async function shoot(name: string): Promise<void> {
  if (CAPTURE_EVIDENCE) {
    const path = await page.screenshot({
      path: `__screenshots__/era-two-field/${name}.png`,
    });
    expect(path, `no screenshot was written for ${name}`).toBeTruthy();
  }
}

/**
 * A camera placed by an explicit world position and target, for the water's edge.
 *
 * The ring cameras above are all the same oblique shot walked round an azimuth, which is right
 * for ground. The traps are the opposite problem: their whole claim is about what stands ABOVE a
 * horizontal plane, and an oblique shot from inside the island looks down onto that plane and
 * flattens exactly the thing under test. So the water's edge gets its own placements, including
 * one at eye level just over the surface.
 */
interface PlacedCamera {
  readonly name: string;
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly fov: number;
}

/** Where the weir is set, mirroring `StarterIsland`'s own placement. */
const WEIR_PHI = Math.PI * 0.7;
const WEIR_X = Math.sin(WEIR_PHI);
const WEIR_Z = Math.cos(WEIR_PHI);

const WATER_CAMERAS: readonly PlacedCamera[] = [
  {
    // THE CRUX FRAME: eye level, just over the water, looking back at the weir from outside it.
    // A prop that reads at 49° can float or vanish here, and "reads as worked water from above
    // the surface" is precisely the claim a distant top-down frame cannot discharge.
    name: "weir-waterline",
    position: [WEIR_X * 38.5, -0.72, WEIR_Z * 38.5],
    target: [WEIR_X * 33.2, -1.3, WEIR_Z * 33.2],
    fov: 32,
  },
  {
    // The same weir at the game's own ~49° oblique, so the pair says how it reads in play as well
    // as how it reads at the surface. The pitch is derived rather than eyeballed — 12u of ground
    // and 13.8u of height is 49° — after two placements that framed open water or the horizon and
    // submitted under 900 triangles apiece, which is a picture of nothing.
    name: "weir-oblique",
    position: [WEIR_X * 21, 12.4, WEIR_Z * 21],
    target: [WEIR_X * 33, -1.4, WEIR_Z * 33],
    fov: 34,
  },
  {
    // The landing, where the skid track is laid over era one's gravel slipway (+Z).
    name: "skid-track",
    position: [0, 6.5, 22.5],
    target: [0, -0.7, 31.5],
    fov: 36,
  },
];

test("photographs era two's authored margin against era one's bare margin", {
  timeout: framedTestBudget(RING_AZIMUTHS.length * RING_FRAMES_PER_ARC),
}, async () => {
  for (const [index, azimuth] of RING_AZIMUTHS.entries()) {
    const eraOne = await frameOf("prehistoric", azimuth);
    await shoot(`arc-${index + 1}-era-1`);
    const eraTwo = await frameOf("neolithic", azimuth);
    await shoot(`arc-${index + 1}-era-2`);

    // FLOORS, so each pair is two pictures of an island rather than two blank canvases.
    expect(eraOne, `arc ${index + 1} era one`).toBeGreaterThan(1000);
    expect(eraTwo, `arc ${index + 1} era two`).toBeGreaterThan(1000);
    // Distinct non-empty renderer populations at every azimuth: the new authored Era 1 graph
    // may cost more than Era 2, so relative triangle count no longer proves which art rendered.
    expect(eraTwo, `arc ${index + 1}`).not.toBe(eraOne);
  }
});

/**
 * **THE WATER'S EDGE — the traps and the skid track, with era one at the same cameras.**
 *
 * The control matters more here than at the ring, because era one already lands boats on this
 * shore: it has a gravel slipway, loose pebbles, boulders and a hide boat within a few units of
 * everything era two adds. Without era one at the identical camera there is no way to say which
 * timber in a picture is the skid track and which is the boat's gunwale.
 */
test("photographs era two's authored water edge against era one's bare shore", {
  timeout: framedTestBudget(WATER_CAMERAS.length * WATER_FRAMES_PER_CAMERA),
}, async () => {
  for (const camera of WATER_CAMERAS) {
    const eraOne = await placedFrameOf("prehistoric", camera);
    await shoot(`${camera.name}-era-1`);
    const eraTwo = await placedFrameOf("neolithic", camera);
    await shoot(`${camera.name}-era-2`);

    expect(eraOne, `${camera.name} era one`).toBeGreaterThan(1000);
    expect(eraTwo, `${camera.name} era two`).toBeGreaterThan(1000);
    expect(eraTwo, camera.name).not.toBe(eraOne);
  }
});
