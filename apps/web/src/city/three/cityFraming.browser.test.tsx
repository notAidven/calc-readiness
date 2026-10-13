import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { CitySurface } from "../CitySurface";
import { CURRENT_ERA_ID } from "../eraDressing";
import { type CityLayout, computeCityLayout } from "../worldLayout";

import "../../styles.css";
import { eraCityLayout } from "../islandLand";
import { CityLighting, cityEnvironment } from "./CityLighting";
import {
  applyCityFraming,
  type CityFraming,
  islandFitRadius,
  islandFraming,
} from "./cityFraming";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { StarterIsland } from "./StarterIsland";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * **CAN YOU SEE THE WHOLE ISLAND? PHOTOGRAPHED, NOT CALCULATED.**
 *
 * `cityFraming.test.ts` measures the projection and every assertion in it passes. That is
 * exactly how a framing can be arithmetically perfect and still wrong on screen — which is the
 * history of the crisis panel next door, where the box was measured at five viewports, declared
 * fixed, and the lead's verdict the next morning was *"cant see the island."*
 *
 * So this renders the real island through the real camera on a real GPU, reads the frame back,
 * and asks the one question the arithmetic cannot: **is there lagoon all the way round it.** A
 * shore running off the bottom edge is a claim about a picture, and this is the picture.
 *
 * ## WHAT IS PHOTOGRAPHED, AND WHY EACH ONE IS IN THE SET
 *
 *  - **1024x580**, the lead's own window, which is where the defect was found and is short;
 *  - **1440x900**, a roomy laptop, because a fix for a short window that ruins a tall one is
 *    not a fix. The vertical overflow is the SAME FRACTION at both (a perspective camera's
 *    vertical frustum is an angle, not a pixel count), so this is not the easy case wearing a
 *    second name — it is the same defect with more room around it;
 *  - **two island radii**, era one's 30 and a grown 46, because the whole point of the layout
 *    taking a radius is that the camera follows growth. The two frames should be the SAME
 *    PICTURE at different scales.
 *
 * Each is shot before and after, so the pair is the evidence rather than the "after" alone.
 * The PNGs land under `__screenshots__/`, which `.gitignore` excludes for the whole tree.
 * Regenerate them with
 *
 *   npx vitest run --config vitest.browser.config.ts apps/web/src/city/three/cityFraming.browser.test.tsx
 *
 * and read them out of `apps/web/src/city/three/__screenshots__/city-framing/`.
 *
 * ## THE ISLAND IS FOUND BY HUE, AND THE FLOOR IS WHAT KEEPS THAT HONEST
 *
 * A land pixel is one whose green beats its blue. Nothing else in this frame is: the sky is a
 * pale blue gradient, the lagoon is teal with a near-to-deep ramp, and the island runs from
 * tussock green through earth to coarse sand — all of which sit on the warm side. A classifier
 * narrowed until it matched nothing would satisfy every "the island is inside the frame"
 * assertion perfectly, so every measurement below carries a pixel floor, and the unframed
 * frames are measured with the same classifier so the before/after pair cannot be a
 * classifier artefact.
 *
 * ## AND IT IS SHOT UNDER REDUCED MOTION, WITH A STABILITY GATE
 *
 * The island's gulls run on the render clock and are worth up to 0.88% whole-frame pixel noise
 * (#413 measured it), which is enough to make a frame comparison both hollow and flaky. Under
 * `reducedMotion` they are posed once and held. The gate below then requires two consecutive
 * captures to be pixel-identical before anything is measured, which also catches a frame taken
 * before the first real draw.
 *
 * ## THE SHUTTER IS NOT LEFT TO CHANCE, BECAUSE THAT IS HOW THIS FILE FIRST WENT RED
 *
 * "Two consecutive captures are pixel-identical" is not the same claim as "this frame shows the
 * framing", and the difference cost a red trunk. As it first shipped the gate read the canvas
 * straight after `renderer.info.render.triangles > 0` — the FIRST draw — while the framing is
 * put on the camera by a React passive effect, which React is free to flush after that draw.
 * Nothing ordered the two. `preserveDrawingBuffer` then keeps the pre-framing frame readable
 * for as long as no newer one lands, so two reads 200ms apart came back identical and the gate
 * pronounced a settled frame that no `setViewOffset` had ever touched. It measured the UNFRAMED
 * island and reported the defect this file exists to catch, on a tree where the framing was
 * perfectly correct: `grass-30 at 1440x900` on the runner, *"the island runs off the bottom
 * edge: expected 1 to be greater than 18"*, `1` being the unframed shore sitting on the last
 * row of pixels.
 *
 * It is worth being precise about how quiet that is. The `before` frame is SUPPOSED to run off
 * the bottom edge, so a stale capture does not look like a broken instrument — it looks exactly
 * like the bug, down to passing `land.top > margin` on the way (the unframed island's top arc
 * is at y=34, comfortably clear of 18) and failing on the one edge a reviewer would believe.
 *
 * So two things below, and neither of them touches a bound:
 *
 *  - **the camera must be CARRYING this frame's framing before anything is read**, checked
 *    against the view offset `applyCityFraming` actually installed and at this canvas's own
 *    size, so a framing computed from a stale R3F `size` is caught too;
 *  - **a DRAW has to separate the two captures**, watched on `info.render.frame`, so
 *    "identical" means settled rather than merely untouched and the first capture provably
 *    postdates the framing. The 200ms between captures stays, because that is what gives
 *    still-loading geometry time to differ.
 *
 * The draw is WAITED FOR RATHER THAN FORCED, and that is deliberate. Calling `render` here
 * would be simpler and quicker, and it would also spend CPU this file used to spend idle —
 * on a two-core runner with two Chromium workers that is taken out of the other worker, and
 * `winterIslandVisible.browser.test.tsx` already records this suite starving an animation
 * assertion in a different file rather than failing in its own. Watching the loop's own
 * counter buys the same guarantee for none of that, and photographs the frame the app drew
 * rather than one the test drew.
 *
 * Injected rather than argued, at `bcc4e865`: delay the framing past the gate and the shipped
 * gate certifies the unframed frame and fails on the bottom edge with `1` against `18`, while
 * this one refuses to measure and says which precondition went unmet.
 */

let h: Harness | null = null;

const FOV = 32;
/** Era one's shipped island, and a grown one. 46 is #413's re-derived growth headroom. */
const ERA_ONE = eraCityLayout("prehistoric");
const GROWN_RADIUS = 46;

const SHORT_LAPTOP = { width: 1024, height: 580 } as const;
const LAPTOP = { width: 1440, height: 900 } as const;
const VIEWPORTS = [SHORT_LAPTOP, LAPTOP] as const;

/**
 * The grown island's LAGOON is scaled here, by hand, and `computeCityLayout` deliberately does
 * not do it.
 *
 * §5.1 / D-ERA26: `ISLAND_GRASS_RADIUS` and `SEA_RADIUS` are independent authored constants and
 * every era that grows the island re-authors its shore, so a layout that derived the lagoon from
 * the grass radius would be putting a number on screen that no era ratified. But a lagoon left
 * at 58 around a grass disc of 46 photographs the MISSING SHORE ART rather than the framing —
 * the camera's frustum scales with the island, so the far background would be off the water.
 * Scaling it here keeps this file's subject the camera.
 */
const GROWN: CityLayout = {
  ...computeCityLayout(GROWN_RADIUS),
  seaRadius: (ERA_ONE.seaRadius * GROWN_RADIUS) / ERA_ONE.islandRadius,
};

const ISLANDS = [
  { label: "grass-30", layout: ERA_ONE },
  { label: `grass-${GROWN_RADIUS}`, layout: GROWN },
] as const;

const CANVAS_WAIT_MS = 15000;
const SHOT_TEST_TIMEOUT_MS = 120000;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** Applies the default framing to the live camera, exactly as `CityFrame` does in the scene. */
function Framing({ layout, on }: { layout: CityLayout; on: boolean }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) {
      return;
    }
    const view = { width: size.width, height: size.height };
    applyCityFraming(camera, on ? islandFraming({ view, layout, fov: FOV }) : null, view);
  }, [camera, layout, on, size.width, size.height]);
  return null;
}

/**
 * Is `camera` carrying the framing {@link frameOf} asked for, at the size it asked for it?
 *
 * The whole width of the view offset is checked rather than only `enabled`, because the two
 * ways this can be wrong are a framing that has not arrived yet and a framing computed from an
 * R3F `size` that is not this canvas's — and only the second survives an `enabled` check. An
 * unframed camera passes with `view === null`, which is the state a fresh `PerspectiveCamera`
 * is in and the one `clearViewOffset` leaves it in.
 */
function carriesFraming(
  camera: THREE.PerspectiveCamera,
  view: { readonly width: number; readonly height: number },
  framing: CityFraming | null,
): boolean {
  const applied = camera.view;
  if (framing === null) {
    return applied === null || applied.enabled === false;
  }
  return (
    applied !== null &&
    applied.enabled === true &&
    applied.fullWidth === view.width &&
    applied.fullHeight === view.height &&
    Math.abs(applied.width - view.width * framing.zoom) < 0.5 &&
    Math.abs(applied.height - view.height * framing.zoom) < 0.5
  );
}

/**
 * Waits until the render loop has DRAWN a frame later than `after`, and answers with which.
 *
 * A timeout here is a real finding rather than a nuisance: a canvas whose loop has stopped can
 * only be photographed as whatever it last left behind, which is exactly the frame this file
 * must never measure. So it says so, instead of reading the stale buffer.
 */
async function drawnAfter(renderer: THREE.WebGLRenderer, after: number): Promise<number> {
  await waitFor(
    () => renderer.info.render.frame > after,
    "the render loop stopped drawing, so nothing readable here is a fresh frame",
    CANVAS_WAIT_MS,
  );
  return renderer.info.render.frame;
}

interface Frame {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly triangles: number;
  readonly png: string;
}

/** The camera position `CityScene`'s `initialCameraPosition` computes, for this layout. */
function cameraPosition(layout: CityLayout): [number, number, number] {
  const [tx, ty, tz] = layout.cameraTarget;
  const az = VILLAGE_CAMERA.azimuthAngle;
  const polar = VILLAGE_CAMERA.polarAngle;
  const s = Math.sin(polar) * layout.cameraDistance;
  return [
    tx + s * Math.sin(az),
    ty + Math.cos(polar) * layout.cameraDistance,
    tz + s * Math.cos(az),
  ];
}

function read(canvas: HTMLCanvasElement): { data: Uint8ClampedArray; png: string } {
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
    png: sink.toDataURL("image/png").split(",")[1] ?? "",
  };
}

function differingPixels(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let differing = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (
      Math.abs((a[i] ?? 0) - (b[i] ?? 0)) > 2 ||
      Math.abs((a[i + 1] ?? 0) - (b[i + 1] ?? 0)) > 2 ||
      Math.abs((a[i + 2] ?? 0) - (b[i + 2] ?? 0)) > 2
    ) {
      differing += 1;
    }
  }
  return differing;
}

/**
 * One settled frame of the island, at the given canvas size, framed or not.
 *
 * `dpr={1}` so one canvas pixel is one CSS pixel and the pixel measurements below can be read
 * against `cityFraming.test.ts`'s CSS-pixel predictions without a conversion in between.
 *
 * THE SIZE COMES FROM A FIXED-SIZE CONTAINER AND NOT FROM `page.viewport`, which is a fix for a
 * measured problem rather than a style choice: vitest runs the test in an iframe on a tester
 * page and SCALES that iframe when the requested viewport is larger than the window, so a
 * requested 1440x900 came back as a 1024x640 canvas — the right aspect ratio at two thirds of
 * the resolution, with a filename claiming otherwise. A container the canvas simply fills gives
 * the frame the size the test names, whatever window the run happens to get, and
 * {@link frameOf}'s caller asserts that it did.
 */
async function frameOf(
  view: { readonly width: number; readonly height: number },
  layout: CityLayout,
  framed: boolean,
): Promise<Frame> {
  let gl: THREE.WebGLRenderer | null = null;
  let cam: THREE.Camera | null = null;
  const env = cityEnvironment("day", false);
  h?.cleanup();
  h = mount(
    <div style={{ width: view.width, height: view.height, overflow: "hidden" }}>
      <Canvas
        shadows
        dpr={1}
        camera={{
          position: cameraPosition(layout),
          fov: FOV,
          near: VILLAGE_CAMERA.nearPlane,
          far: layout.islandRadius * VILLAGE_CAMERA.farPlaneRatio,
        }}
        // Kept so the frame can be READ BACK; without it the buffer is cleared between the draw
        // and the sample and every measurement here is of an empty canvas.
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          gl = state.gl;
          cam = state.camera;
          state.gl.toneMapping = THREE.ACESFilmicToneMapping;
          state.gl.toneMappingExposure = 1;
        }}
      >
        <color attach="background" args={[env.background]} />
        <fog
          attach="fog"
          args={[env.fog, layout.islandRadius * 3, layout.islandRadius * 20]}
        />
        <CityLighting islandRadius={layout.islandRadius} variant="day" />
        <StarterIsland layout={layout} reducedMotion eraId={CURRENT_ERA_ID} />
        <Framing layout={layout} on={framed} />
      </Canvas>
    </div>,
  );

  await waitFor(() => gl !== null, "the canvas never created", CANVAS_WAIT_MS);
  const renderer = gl as unknown as THREE.WebGLRenderer;
  const camera = cam as unknown as THREE.PerspectiveCamera;
  await waitFor(
    () => renderer.info.render.triangles > 0,
    "the renderer submitted nothing",
    CANVAS_WAIT_MS,
  );

  /*
   * THE CAMERA HAS TO BE CARRYING THIS FRAME'S FRAMING FIRST. `Framing` installs it from a
   * React passive effect, which React may flush after the first draw, so without this the frame
   * read below is whatever happened to be in the buffer — and an unframed one is indistinguish-
   * able from the defect. See the header: this is the precondition whose absence went red.
   */
  const wanted = framed ? islandFraming({ view, layout, fov: FOV }) : null;
  await waitFor(
    () => carriesFraming(camera, view, wanted),
    `the camera never took the ${framed ? "framing" : "unframed view"} this shot is of`,
    CANVAS_WAIT_MS,
  );
  const framedAtFrame = renderer.info.render.frame;

  /*
   * THE STABILITY GATE. Two consecutive captures have to be pixel-identical before anything is
   * measured — which catches a frame taken before the island's geometry has settled as well as
   * any residual animation. Under reduced motion the gulls are posed once and held, so this
   * settles immediately; without it the gate is what would fail rather than the assertions.
   *
   * A DRAW separates every pair of captures, which is what makes "identical" mean settled
   * rather than merely UNTOUCHED: the buffer survives between draws, so two reads that straddle
   * no draw at all agree trivially, and that is how the gate came to certify a frame older than
   * the framing.
   */
  let drawnAt = await drawnAfter(renderer, framedAtFrame);
  let previous = read(renderer.domElement);
  let settled: { data: Uint8ClampedArray; png: string } | null = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    drawnAt = await drawnAfter(renderer, drawnAt);
    const next = read(renderer.domElement);
    if (differingPixels(previous.data, next.data) === 0) {
      settled = next;
      break;
    }
    previous = next;
  }
  if (!settled) {
    throw new Error("the frame never settled, so nothing measured here is repeatable");
  }
  return {
    data: settled.data,
    png: settled.png,
    width: renderer.domElement.width,
    height: renderer.domElement.height,
    triangles: renderer.info.render.triangles,
  };
}

async function keep(name: string, frame: Frame): Promise<void> {
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `apps/web/src/city/three/__screenshots__/city-framing/${name}.png`,
      frame.png,
      { encoding: "base64" },
    );
  }
}

/**
 * WHERE THE LAND IS, read off the frame — as the LARGEST CONNECTED MASS of it.
 *
 * A land pixel is one whose green beats its blue. The sky and the lagoon are both cool; the
 * island's tussock, earth and sand are all warm, so this separates them without a per-material
 * threshold to keep in sync with the art. 12 keeps the wet gravel at the waterline — the coolest
 * thing on the island — on the land side while leaving the deepest lagoon tone well clear.
 *
 * **AND THEN THE EXTREMES ARE TAKEN OVER ONE CONNECTED MASS, WHICH IS NOT FUSSINESS.** A bare
 * bounding box over every warm pixel was tried first and it measured the GULLS: the flock wheels
 * over the lagoon at 34-51u up, its beaks are orange, and one bird clipped by the top-right
 * corner put `top` at 0 and `right` at the frame's edge in a frame whose island was correctly
 * framed with a hundred pixels of water on every side. That is the same failure
 * `winterIslandVisible.browser.test.tsx` records about its own classifier — one pixel is enough
 * to ruin an extremum — and a flood fill answers it, because a bird drawn over water is its own
 * component. A bird drawn over the ISLAND would merge into it, which is why the assertions below
 * also check the mass's box against `groundRingOnScreen`'s prediction rather than only against
 * the frame's edges. The mass's own pixel count is returned so a classifier that matched almost
 * nothing cannot satisfy any of it.
 */
function landBox(frame: Frame): {
  top: number;
  bottom: number;
  left: number;
  right: number;
  pixels: number;
  islands: number;
} {
  const { width, height, data } = frame;
  const land = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const at = i * 4;
    land[i] = (data[at + 1] ?? 0) - (data[at + 2] ?? 0) > 12 ? 1 : 0;
  }
  let best = { top: 0, bottom: 0, left: 0, right: 0, pixels: 0 };
  let islands = 0;
  const stack: number[] = [];
  for (let seed = 0; seed < land.length; seed += 1) {
    if (land[seed] !== 1) {
      continue;
    }
    islands += 1;
    let top = height;
    let bottom = -1;
    let left = width;
    let right = -1;
    let pixels = 0;
    stack.push(seed);
    land[seed] = 2;
    while (stack.length > 0) {
      const at = stack.pop() as number;
      const x = at % width;
      const y = (at - x) / width;
      pixels += 1;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
      for (const next of [
        x > 0 ? at - 1 : -1,
        x < width - 1 ? at + 1 : -1,
        y > 0 ? at - width : -1,
        y < height - 1 ? at + width : -1,
      ]) {
        if (next >= 0 && land[next] === 1) {
          land[next] = 2;
          stack.push(next);
        }
      }
    }
    if (pixels > best.pixels) {
      best = { top, bottom, left, right, pixels };
    }
  }
  return { ...best, islands };
}

test("photographs the short window the defect was found at, and a roomy one", () => {
  expect(VIEWPORTS.map((v) => `${v.width}x${v.height}`)).toEqual(["1024x580", "1440x900"]);
  expect(Math.min(...VIEWPORTS.map((v) => v.height))).toBeLessThanOrEqual(580);
  // Two radii, and the grown one is bigger, so the growth claim has something to be about.
  expect(ISLANDS).toHaveLength(2);
  expect(GROWN.islandRadius).toBeGreaterThan(ERA_ONE.islandRadius);
  expect(GROWN.cameraDistance).toBeGreaterThan(ERA_ONE.cameraDistance);
});

for (const island of ISLANDS) {
  for (const view of VIEWPORTS) {
    const at = `${island.label} at ${view.width}x${view.height}`;
    test(
      `there is lagoon all the way round the island — ${at}`,
      async () => {
        /*
         * THE DEFECT FIRST, AS A PHOTOGRAPH AND AS PIXELS. The "after" frame alone proves
         * nothing: an island drawn correctly by accident and an island drawn correctly by this
         * change look identical, and only the pair says which happened.
         */
        const before = await frameOf(view, island.layout, false);
        await keep(`before-${island.label}-${view.width}x${view.height}`, before);
        expect(before.triangles, `nothing was drawn, ${at}`).toBeGreaterThan(1000);
        // The frame really is the size this test names, rather than an iframe-scaled stand-in.
        expect(before.width, at).toBe(view.width);
        expect(before.height, at).toBe(view.height);
        const wasLand = landBox(before);
        expect(wasLand.pixels, `no island in the frame at all, ${at}`).toBeGreaterThan(
          20000,
        );
        expect(
          wasLand.bottom,
          `the island already clears the bottom edge unframed, so there is nothing to fix — ${at}`,
        ).toBe(before.height - 1);

        const after = await frameOf(view, island.layout, true);
        await keep(`after-${island.label}-${view.width}x${view.height}`, after);
        expect(after.triangles, `nothing was drawn, ${at}`).toBeGreaterThan(1000);
        // The margin every claim below is measured against is a share of THIS frame, so the
        // frame has to be the size the test names for the share to mean what it says.
        expect(after.width, at).toBe(view.width);
        expect(after.height, at).toBe(view.height);
        const land = landBox(after);

        /*
         * A FLOOR, so nothing below is vacuous: a frame with no island in it satisfies "there is
         * lagoon on all four sides" perfectly. Measured, these frames carry well over a hundred
         * thousand land pixels in the island's own mass, so this is a floor and not a target.
         */
        expect(land.pixels, `no island in the frame at all, ${at}`).toBeGreaterThan(20000);

        // THE CLAIM: water on every side, at the margin the fit was sized for. Read against the
        // frame's own height/width rather than a constant, so it holds at either canvas size.
        const margin = Math.min(after.width, after.height) * 0.02;
        expect(land.top, `the island is cut off at the top, ${at}`).toBeGreaterThanOrEqual(
          margin,
        );
        expect(
          after.height - land.bottom,
          `the island runs off the bottom edge, ${at}`,
        ).toBeGreaterThan(margin);
        expect(land.left, `the island is cut off on the left, ${at}`).toBeGreaterThan(
          margin,
        );
        expect(
          after.width - land.right,
          `the island is cut off on the right, ${at}`,
        ).toBeGreaterThan(margin);

        // AND IT IS STILL BIG, which every assertion above would let a speck through on.
        expect(
          (land.bottom - land.top) / after.height,
          `the island reads only ${Math.round(((land.bottom - land.top) / after.height) * 100)}% of the frame's height, ${at}`,
        ).toBeGreaterThan(0.7);

        // The authored 13-facet silhouette is measured by the frame above; the unit guard
        // separately proves every opaque mesh stays inside `islandFitRadius`. Binding these
        // pixels to the retired 9-gon ring projection would freeze the old art again.
        expect(islandFraming({ view, layout: island.layout, fov: FOV }), at).not.toBeNull();
      },
      SHOT_TEST_TIMEOUT_MS,
    );
  }
}

/**
 * **AND THE TWO RADII ARE THE SAME PICTURE**, which is the whole of "the camera follows a
 * growing island". Compared as frames rather than as numbers: the island's box on screen is the
 * same box at grass 30 and grass 46, because the dolly is the radius's.
 */
test(
  "a grown island is framed to the same picture as era one's",
  async () => {
    const view = SHORT_LAPTOP;
    const eraOne = landBox(await frameOf(view, ERA_ONE, true));
    const grown = landBox(await frameOf(view, GROWN, true));

    expect(eraOne.pixels).toBeGreaterThan(20000);
    expect(grown.pixels).toBeGreaterThan(20000);
    // Within a few percent of the frame on every edge. Not identical: the shore's four units of
    // beach are an absolute width, so they are a smaller share of a bigger disc and a grown
    // island is framed very slightly larger.
    const slack = view.height * 0.05;
    expect(Math.abs(grown.top - eraOne.top), "top").toBeLessThan(slack);
    expect(Math.abs(grown.bottom - eraOne.bottom), "bottom").toBeLessThan(slack);
    expect(Math.abs(grown.left - eraOne.left), "left").toBeLessThan(slack);
    expect(Math.abs(grown.right - eraOne.right), "right").toBeLessThan(slack);
    // ...and larger rather than smaller, which is the direction the beach's share predicts.
    expect(grown.bottom - grown.top).toBeGreaterThanOrEqual(eraOne.bottom - eraOne.top);
  },
  SHOT_TEST_TIMEOUT_MS,
);

/** The fit radius really is the drawn island's, restated here so the browser file is self-contained. */
test("fits the grass disc plus its shore, not the buildable disc", () => {
  expect(islandFitRadius(ERA_ONE.islandRadius)).toBeGreaterThan(ERA_ONE.islandRadius);
  expect(islandFitRadius(ERA_ONE.islandRadius)).toBeLessThan(ERA_ONE.seaRadius);
});

/**
 * **AND THE WHOLE GAME, WITH ITS HUD OVER IT, at the lead's window.**
 *
 * Everything above photographs the canvas on its own, which is the right instrument for a
 * camera claim and the wrong one for *"is the island actually visible in the game"*: the HUD
 * is drawn over the same pixels and this framing pushes the island's shore out toward the
 * edges, which is exactly where the HUD lives. So this is the composition, once, at 1024x580.
 *
 * What it answers, and the reason it is here rather than left to a reviewer: the dock is
 * `right: 0; bottom: 0; left: 0` with `justify-content: space-between`, so it is two corner
 * clusters and an empty middle — and the island's near shore sits in that middle.
 *
 * OFF BY DEFAULT, for the reason `winterIslandVisible.browser.test.tsx` records: a full
 * shadow-mapped scene with the settlement's GLBs in it is heavy, and a heavy scene left on in
 * this suite starves an animation-timing assertion in a different file rather than failing
 * here. Take it with
 *
 *   VITE_CITY_FRAMING_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/city/three/cityFraming.browser.test.tsx
 */
test.runIf(Boolean(import.meta.env.VITE_CITY_FRAMING_SHOTS))(
  "photographs the whole game shell over the framed island at the lead's window",
  async () => {
    const view = SHORT_LAPTOP;
    await page.viewport(view.width, view.height);
    h = mount(<CitySurface enableCanvas onOpenSurface={() => undefined} />);
    await waitFor(
      () => document.querySelector(".city-viewport canvas") !== null,
      "the city canvas never mounted",
      30000,
    );
    await document.fonts.ready;
    await new Promise<void>((resolve) => setTimeout(resolve, 3000));

    /*
     * A THROWAWAY CAPTURE FIRST, and it is load-bearing — `winterIslandVisible` measured this.
     * `Page.captureScreenshot` with a clip puts a device-metrics override on the page, which
     * R3F reads as a resize and re-renders through; the frame the FIRST capture returns is the
     * one drawn before any of that settled.
     */
    const frameElement = window.frameElement as HTMLElement | null;
    if (!frameElement) {
      throw new Error("not inside vitest's tester iframe, so nothing can be clipped");
    }
    const session = cdp() as unknown as {
      send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
    };
    const capture = async () => {
      const box = frameElement.getBoundingClientRect();
      const outer = window.parent as Window;
      const shot = await session.send("Page.captureScreenshot", {
        format: "png",
        clip: {
          x: box.left + outer.scrollX,
          y: box.top + outer.scrollY,
          width: box.width,
          height: box.height,
          scale: 1,
        },
      });
      if (!shot.data) {
        throw new Error("CDP returned no screenshot data");
      }
      return shot.data;
    };
    await capture();
    await new Promise<void>((resolve) => setTimeout(resolve, 900));
    if (CAPTURE_EVIDENCE) {
      await commands.writeFile(
        `apps/web/src/city/three/__screenshots__/city-framing/game-shell-${view.width}x${view.height}.png`,
        await capture(),
        { encoding: "base64" },
      );
    }
  },
  180000,
);
