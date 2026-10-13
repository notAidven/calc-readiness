import { type ReactElement, useRef, useState } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { findButton, type Harness, mount, waitFor } from "../../lessons/testHarness";
import { WINTER_NODE_ORDER } from "../../winter/hardWinterItems";
import { resolveBuildingModel } from "../buildingAssets";
import { CURRENT_ERA_ID } from "../eraDressing";
import { resolveTownHallModel } from "../townHall";
import type { PlacedTransform } from "../worldLayout";
import type { OrbitControlsLike } from "./applyOrbit";
import { CityCanvasHost } from "./CityCanvasHost";
import type { ScenePlacement, SceneTownHall } from "./CityScene";
import { type WinterCityBoard, WinterInCity } from "./WinterInCity";

import "../../styles.css";
import { eraCityLayout } from "../islandLand";

/**
 * **CAN YOU SEE THE ISLAND? PHOTOGRAPHED, NOT CALCULATED.**
 *
 * `winterInCitySheet.browser.test.tsx` measures the panel's box at five viewports and every
 * assertion in it passes. It mounts `WinterInCity` and nothing else, so its screenshots are a
 * panel on a blank page — which is exactly how the box could be measured, declared fixed, and
 * still be wrong on screen: the lead's verdict the next morning was *"cant see the island."*
 *
 * So this file mounts the OTHER half — the city's own canvas, its real camera, its real island
 * and the settlement's real GLBs — underneath the same panel, and asks about the COMPOSITION
 * rather than about either piece.
 *
 * ## THE PANEL IS A SIDE PANEL NOW, AND THAT CHANGED WHICH AXIS THIS FILE MEASURES
 *
 * It was a bottom band, and the island is drawn CENTRED because `layout.cameraTarget` is the
 * island's middle — so the band covered the island's lower half, `winterFraming.ts` lifted the
 * frame over it, and the lead's verdict on THAT was *"now we're too zoomed out to see the actual
 * island."* His ruling: *"maybe make it a sidebar instead of at the bottom."*
 *
 * A side panel takes width, which the wide disc in a wide viewport has to spare, so the
 * correction became a sideways slide and a 1.5x view instead of a lift and a 2.3x one. Every
 * assertion below therefore reads across the screen rather than down it: the settlement's stars
 * are to the RIGHT of the panel's right edge, and they fill the strip beside it.
 *
 * ## WHAT WAS ACTUALLY WRONG, MEASURED HERE BEFORE IT WAS FIXED
 *
 * From the `island-only-1024x580.png` this file wrote at its parent: the whole disc fitted inside
 * the top half of the frame with dark ocean all round it, the buildings at 42% of their unframed
 * size. Measured through the projection in `winterFraming.test.ts`, the band's fit needed 2.32x
 * there; the side panel's needed 1.59x at half the screen and needs 1.47x now that the panel is
 * sized to its content, which is the whole of what a narrower panel buys the camera.
 *
 * `winterFraming.test.ts` is the always-on guard over the arithmetic; this file is the picture,
 * and the one measurement the arithmetic cannot make: that the settlement is really THERE in the
 * frame the renderer produced, rather than fogged out, culled, or moved off screen by a framing
 * that satisfies every equation.
 *
 * ## IT IS OFF BY DEFAULT, FOR THE REASON `winterCrisisShots` RECORDS
 *
 * Run `VITE_WINTER_SHOTS=1 npm run test:browser` to take the pictures.
 *
 * Two full shadow-mapped scenes with seven GLBs each is heavy, and a heavy scene left on in
 * this suite does not fail — it starves an animation-timing assertion in a DIFFERENT file, one
 * per run, which is worse than not having the photographs in CI because the next reader cannot
 * tell it from a real regression. `winterFraming.test.ts` carries the claim in CI instead.
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/**
 * The two laptop viewports the review asked for; the lead's window is SHORT.
 *
 * 1024x580 is measured off his own screenshot and replaces the 1024x640 that stood here. Sixty
 * pixels of height is the difference between a layout that fits and one that does not, and the
 * whole history of this panel is a review passing at a developer's window and failing at his.
 */
const LAPTOP = { width: 1440, height: 900 } as const;
const SHORT_LAPTOP = { width: 1024, height: 580 } as const;
const VIEWPORTS = [LAPTOP, SHORT_LAPTOP] as const;

const LAYOUT = eraCityLayout("prehistoric");

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
/**
 * The last board the winter published, so a test can drive a cell pick the way the canvas does.
 * Held out here as well as in React state because `onAimCell` is the only seam a pick has.
 */
let published: WinterCityBoard | null = null;

beforeAll(() => {
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
  published = null;
});

function placed(nodeId: string, col: number, row: number): PlacedTransform {
  return { nodeId, col, row, rot: 0 };
}

/**
 * Era one's six skills plus the hall, SPREAD ACROSS THE BOARD on purpose.
 *
 * A packed city would sit inside any strip and prove nothing about the framing. These reach
 * cols -4..4 and rows -4..4, so the settlement spans most of the buildable disc and the claim
 * below is about the whole board rather than about its middle.
 */
const CITY: readonly PlacedTransform[] = [
  placed("NUM.S", -4, -3),
  placed("NUM.F", 2, 3),
  placed("NUM.2", 4, -1),
  placed("NUM.3", -3, 2),
  placed("NUM.4", 1, -4),
  placed("NUM.5", -1, 0),
];
const HALL: PlacedTransform = { nodeId: "town-hall", col: -1, row: -1, rot: 0 };

const SCENE_PLACED: readonly ScenePlacement[] = CITY.map((p) => ({
  nodeId: p.nodeId,
  col: p.col,
  row: p.row,
  rot: p.rot,
  model: resolveBuildingModel(p.nodeId, "built"),
  mastery: 2,
  celebrateToken: 0,
}));

const SCENE_HALL: SceneTownHall = {
  col: HALL.col,
  row: HALL.row,
  rot: HALL.rot,
  model: resolveTownHallModel("built"),
  celebrateToken: 0,
};

/**
 * The city and the crisis, wired the way `CitySurface` wires them.
 *
 * `WinterInCity` publishes one moment of the winter through `onBoard` and the canvas host takes
 * it as `winterRows` / `winterFires` / `ruinedNodeIds`. That seam is the composition under
 * test, so it is driven rather than stubbed: a board that never reached the canvas would leave
 * a fair-weather island under a crisis panel, and every measurement here would be about the
 * wrong picture.
 */
function CityUnderWinter(): ReactElement {
  const [board, setBoard] = useState<WinterCityBoard | null>(null);
  const controlsRef = useRef<OrbitControlsLike | null>(null);
  published = board;
  return (
    <div className="city-shell">
      <div className="city-surface" data-winter={board !== null ? "true" : "false"}>
        <div className="city-viewport" data-testid="city-viewport">
          <CityCanvasHost
            enableCanvas
            layout={LAYOUT}
            placed={SCENE_PLACED}
            townHall={SCENE_HALL}
            variant="day"
            reducedMotion
            controlsRef={controlsRef}
            onSelect={() => undefined}
            eraId={CURRENT_ERA_ID}
            winterRows={board?.rows ?? null}
            winterFires={board?.fires}
            ruinedNodeIds={board?.ruinedNodeIds}
            frostStageByNodeId={board?.frostStageByNodeId}
            onAimWinterCell={board?.onAimCell ?? undefined}
            fallback={<div data-testid="canvas-fallback" />}
          />
        </div>
      </div>
      <WinterInCity
        placements={CITY}
        townHall={HALL}
        canvasLive
        practisedNodeIds={WINTER_NODE_ORDER}
        onBoard={setBoard}
        onExit={() => undefined}
      />
    </div>
  );
}

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

function panel(): HTMLElement {
  return query<HTMLElement>(".winter-in-city .hw-shell");
}

/** Mount the composition and wait for the SETTLEMENT to be drawn, not merely mounted. */
async function openCrisisOverTheIsland(view: {
  readonly width: number;
  readonly height: number;
}): Promise<void> {
  await page.viewport(view.width, view.height);
  h = mount(<CityUnderWinter />);
  await waitFor(
    () => document.querySelector(".city-viewport canvas") !== null,
    "the city canvas never mounted",
    30000,
  );
  await waitFor(
    () => document.querySelector(".winter-in-city .hw-shell") !== null,
    "the crisis panel never rendered",
    30000,
  );
  await document.fonts.ready;
  // The GLBs resolve behind their own Suspense boundaries and the frost course rebuilds when
  // the board arrives, so a first frame is a bare island. There is no renderer handle out here
  // to count triangles through, so this waits on the clock and the pixel floor below is what
  // makes a too-early sample fail rather than pass quietly.
  await new Promise<void>((resolve) => setTimeout(resolve, 2500));

  /*
   * A THROWAWAY CAPTURE, and it is load-bearing. `Page.captureScreenshot` with a `clip` puts a
   * device-metrics override on the page, which is a resize as far as R3F is concerned: it
   * re-measures the canvas and re-renders, and the frame that comes back from the FIRST capture is
   * the one drawn before any of that settled. Measured: the first clipped capture after a mount
   * came back as flat pale sky with no island in it, over a canvas the hit-test still put under the
   * pointer at that exact point, while the next capture 200ms later showed the island correctly
   * framed. So the first one is spent here and every capture the test reads is a settled one.
   */
  await capture();
  await new Promise<void>((resolve) => setTimeout(resolve, 600));
}

/**
 * ONE FRAME OF THE REAL SCREEN, as pixels.
 *
 * Not a canvas read-back: `CityScene` does not set `preserveDrawingBuffer`, so the back buffer
 * is gone before a test can reach it — measured, `getImageData` over that canvas returns every
 * pixel at alpha 0. The page capture is also the better instrument, because what comes back is
 * the composited screen the reviewer is looking at rather than either piece of it.
 *
 * The report is in CSS pixels of this test's viewport, so it can be compared with the panel's
 * own `getBoundingClientRect`.
 */
/**
 * WHERE THIS TEST'S VIEWPORT SITS INSIDE THE BROWSER WINDOW.
 *
 * Vitest runs the test in an iframe on a tester page and SCALES that iframe down when the
 * requested viewport is larger than the window — measured on this machine: a window of
 * 1024x576 holds a requested 1440x900 at 0.64, so `window.innerWidth` correctly reports 1440
 * while the pixels on the real screen are 921 across. Every capture below is clipped to this
 * box, which is what makes an image pixel divide cleanly back into a CSS pixel of the viewport
 * the assertions are written in.
 */
function testViewportBox(): {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
} {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const box = frameElement.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
    scale: box.height / window.innerHeight,
  };
}

/**
 * The composited frame, clipped to this test's viewport, as a base64 PNG.
 *
 * `Page.captureScreenshot` over CDP rather than `page.screenshot`, and that is a fix for a
 * measured failure rather than a preference: `page.screenshot` is Playwright's LOCATOR capture,
 * which runs the actionability checks first, and against this page it never gets past *"waiting
 * for element to be stable"* — the canvas runs `frameloop="always"`. CDP captures the frame as
 * it stands and waits for nothing.
 */
async function capture(): Promise<string> {
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const box = testViewportBox();
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
  });
  if (!shot.data) {
    throw new Error("CDP returned no screenshot data");
  }
  return shot.data;
}

/** Keep a captured frame, as a picture for the review. Written through vitest's own command. */
async function keep(name: string, shot: string): Promise<void> {
  if (SHOTS) {
    await commands.writeFile(
      `apps/web/src/city/three/__screenshots__/winter-island/${name}.png`,
      shot,
      { encoding: "base64" },
    );
  }
}

async function frame(base64: string): Promise<{
  data: Uint8ClampedArray;
  width: number;
  height: number;
}> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("the screenshot did not decode"));
    image.src = `data:image/png;base64,${base64}`;
  });
  const sink = document.createElement("canvas");
  sink.width = image.naturalWidth;
  sink.height = image.naturalHeight;
  const ctx = sink.getContext("2d");
  if (!ctx) {
    throw new Error("no 2D context to sample the frame with");
  }
  ctx.drawImage(image, 0, 0);
  return {
    data: ctx.getImageData(0, 0, sink.width, sink.height).data,
    width: sink.width,
    height: sink.height,
  };
}

/**
 * WHERE THE SETTLEMENT IS DRAWN, read off that frame.
 *
 * THE MASTERY STARS ARE THE MARKER, and picking them is what makes this measurable at all. Two
 * classifiers were tried first and both measure the wrong thing:
 *
 *  - CHROMA counts the frozen lagoon, which fills the frame. It reported the settlement running
 *    to y=897 of a 900px viewport — a measurement of the water;
 *  - WARM (`r - b` over a margin) counts the shore, which is sand and rings the whole island
 *    outside the buildable disc. It reported 117px behind the band over a frame whose settlement
 *    was entirely clear of it.
 *
 * A star is unambiguous: `MasteryStars` fills at `0xffc23d` with an `0xffb703` emissive, and there
 * is nothing else in a winter frame that is bright, strongly yellow and unsaturated in blue. Every
 * building on this island wears three of them, so "the stars are all in the free strip" is a claim
 * about where the BUILDINGS are, read off the frame, and it is the claim a reviewer looking at the
 * screen would make.
 *
 * ## THE THIRD CLASSIFIER WAS STILL TOO LOOSE, AND ONE PIXEL IS ENOUGH TO RUIN AN EXTREMUM
 *
 * `r > 190 && g > 130 && g < r - 20 && b < 110` was written against the star's MATERIAL, and the
 * material is not what lands in the frame. Measured off `island-only-1024x580.png` with a decoder
 * rather than reasoned about: a star pixel renders at **(240, 208, 112)** under the winter's light,
 * not the (255, 194, 61) the mesh is authored with — lighter, and half again as blue. So `b < 110`
 * was throwing away the body of every star and keeping its darker edges, 253 pixels out of 664, and
 * the island's own EARTH tone `0xc9a06a` — (201, 160, 106) — cleared all four tests. That put
 * `left` at 449 with a histogram showing ONE pixel in that sixteenth of the frame and the real
 * cluster 160px further right, so a correctly framed settlement failed by 77px on a speck of dirt.
 *
 * The bounds below are the RENDERED star: bright, and ordered `r > g > b` with a wide r-to-b gap.
 * Earth fails on `r > 210` (201), the frozen ground and the fog fail on `r > g` (they are neutral or
 * cool), and the sandy shore fails on brightness (208). The pixel floor below is what keeps the
 * tightening honest — a classifier narrowed until it matched nothing would satisfy every extremum
 * assertion in this file perfectly — and it has six times its own room: 664 stars pixels at
 * 1024x580, 1119 at 1440x900.
 */
function starBand(
  sample: { data: Uint8ClampedArray; width: number; height: number },
  view: { readonly width: number; readonly height: number },
): { top: number; bottom: number; left: number; right: number; pixels: number } {
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let pixels = 0;
  for (let y = 0; y < sample.height; y += 1) {
    for (let x = 0; x < sample.width; x += 1) {
      const at = (y * sample.width + x) * 4;
      const r = sample.data[at] ?? 0;
      const g = sample.data[at + 1] ?? 0;
      const b = sample.data[at + 2] ?? 0;
      if (!(r > 210 && g > 180 && b < 160 && r - b > 80 && r > g && g > b)) {
        continue;
      }
      pixels += 1;
      const cssY = (y * view.height) / sample.height;
      const cssX = (x * view.width) / sample.width;
      top = Math.min(top, cssY);
      bottom = Math.max(bottom, cssY);
      left = Math.min(left, cssX);
      right = Math.max(right, cssX);
    }
  }
  return { top, bottom, left, right, pixels };
}

/**
 * The one assertion that runs unconditionally, so a gated file is never an empty one and the
 * set it photographs cannot quietly lose the viewport the review named. The lead's window is
 * SHORT, and a short viewport is where the settlement is largest relative to the screen — a shot
 * list with only the roomy laptop in it would photograph the easy case and answer nothing.
 */
test("photographs the two laptop viewports the review named, including the short one", () => {
  expect(VIEWPORTS).toHaveLength(2);
  expect(VIEWPORTS.map((v) => `${v.width}x${v.height}`)).toEqual(["1440x900", "1024x580"]);
  expect(Math.min(...VIEWPORTS.map((v) => v.height))).toBeLessThanOrEqual(580);
});

for (const view of VIEWPORTS) {
  test.runIf(SHOTS)(
    `the settlement is drawn beside the crisis panel at ${view.width}x${view.height}`,
    async () => {
      await openCrisisOverTheIsland(view);
      expect(panel().dataset.phase, "the crisis did not open on declare").toBe("declaring");

      const box = panel().getBoundingClientRect();
      // A SIDE PANEL, and the premise of every claim below: anchored to the left edge, so what it
      // covers is a column and what it leaves free is the rest of the width.
      expect(box.left, "the panel is not against the left edge").toBeLessThan(20);

      /*
       * THE PICTURE FIRST, so there is evidence to read whatever the assertions do — and FIRST
       * for a second reason, measured. Every CDP capture goes through an emulation override, and
       * a second one taken later in the same test came back with the scene re-rendered at a
       * different framing: pale fog where the island had been, over a canvas the hit-test still
       * put under the pointer. So the composite is the first capture after the mount settles, and
       * the measurement is taken from the one after it rather than from a third.
       */
      const composite = await capture();
      await keep(`declare-${view.width}x${view.height}`, composite);
      /*
       * NOTHING IN THE WINTER'S MOUNT COVERS THE STRIP, enumerated rather than eyeballed.
       *
       * This is the assertion the composite photograph cannot make, and the reason it cannot is
       * worth writing down: a WebGL canvas composites on its own layer, and a CDP capture taken
       * with a full-screen overlay above it comes back with a STALE canvas frame — the pale
       * unframed sky from before the board published, over pixels the live scene had long since
       * replaced. Measured: two consecutive captures agreed with each other and disagreed with the
       * capture taken 200ms later with the overlay hidden, which is why `island-only-*.png` is the
       * photograph of the canvas and `declare-*.png` is the photograph of the panel.
       *
       * So the claim is made in the DOM instead, where it is exact: every element whose box
       * contains the middle of the free strip — which for a side panel is the middle of the
       * remaining WIDTH at the middle of the height, and is the point the camera is now aimed at.
       * The list must be the page, the shell, the canvas and the winter's own transparent overlay
       * — and NOT `.hw-shell`, which is what would be there if the panel reached into the strip.
       */
      const stripMiddle = box.right + (view.width - box.right) / 2;
      const overStrip = Array.from(document.querySelectorAll("*")).filter((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.width > 0 &&
          r.top <= view.height / 2 &&
          r.bottom >= view.height / 2 &&
          r.left <= stripMiddle &&
          r.right >= stripMiddle
        );
      });
      expect(overStrip.length, "nothing was found over the strip at all").toBeGreaterThan(
        3,
      );
      for (const el of overStrip) {
        expect(
          panel().contains(el),
          `${el.tagName}.${el.className} reaches into the strip beside the crisis panel`,
        ).toBe(false);
      }
      expect(
        overStrip.some((el) => el.tagName === "CANVAS"),
        "the island's canvas does not reach the strip the panel leaves free",
      ).toBe(true);

      // The same frame with the panel out of the way, which is where the settlement is measured:
      // the occlusion is the assertion, so measuring it on a frame that already had the panel in
      // it would be circular, and the panel's own chrome carries gold.
      const mount = query<HTMLElement>(".winter-in-city");
      mount.style.visibility = "hidden";
      let island: string;
      try {
        island = await capture();
      } finally {
        mount.style.visibility = "";
      }
      // Kept unconditionally: with the overlay hidden this is the only capture that shows the
      // canvas layer as it actually stands, so it is the photograph of the camera fix.
      await keep(`island-only-${view.width}x${view.height}`, island);
      const stars = starBand(await frame(island), view);

      /*
       * A FLOOR, so nothing below is vacuous: a frame with no settlement in it would satisfy
       * "nothing is behind the panel" perfectly. Measured, this frame carries 664 star pixels at
       * 1024x580 and 1119 at 1440x900, so the floor is a floor and not a target.
       */
      expect(stars.pixels, "no mastery stars in the frame at all").toBeGreaterThan(100);

      // AND EVERY BUILDING IS CLEAR OF THE PANEL, failing by exactly as much as one is covered.
      expect(
        stars.left,
        `a building sits ${Math.round(box.right - stars.left)}px behind the crisis panel`,
      ).toBeGreaterThanOrEqual(box.right);

      // AND THEY SPREAD ACROSS THE FREE STRIP rather than bunching against its far edge, which is
      // what a framing that slid too far or widened too hard would look like.
      const strip = view.width - box.right;
      const spread = stars.right - stars.left;
      expect(
        spread / strip,
        `the settlement spans only ${Math.round((spread / strip) * 100)}% of the strip`,
      ).toBeGreaterThan(0.35);

      /*
       * AND THE SETTLEMENT IS BIG, which is the objection the side panel exists to answer and the
       * one every other assertion here would let through. *"Too zoomed out to see the actual
       * island"* was said about a frame that satisfied all of them.
       *
       * Read as a share of the SCREEN's height rather than of the strip, because the strip is the
       * thing under review: a narrower panel would leave a wider strip and could fill a larger
       * share of it with a smaller island. The stars sit on roofs spread over most of the buildable
       * disc, so their vertical span is a fair proxy for how big the settlement reads.
       *
       * 0.33 is between two measurements taken with the same classifier on the same city. Under the
       * band and its vertical lift, at this same 1024x580: the stars spanned y=62..205, which is
       * **24.7%** of the screen, and that is the picture the lead rejected. Under the side panel:
       * y=173..394, **38.1%**. So this fails on the frame the objection was about and passes on the
       * frame that answers it, which is the only property that makes a number like this worth
       * asserting.
       */
      expect(
        (stars.bottom - stars.top) / view.height,
        `the settlement is only ${Math.round(((stars.bottom - stars.top) / view.height) * 100)}% of the screen's height`,
      ).toBeGreaterThan(0.33);

      /*
       * THE CRISIS LOST NOTHING FOR IT, which is the trade this layout exists to make rather than
       * dodge: the panel still lays out its own content and the question is not back in a rail.
       *
       * IT USED TO BE A PIXEL FLOOR OF 500 AND A SHARE FLOOR OF 0.4, and both went when the panel
       * stopped being a share of the viewport. `min(470px, 50vw)` is 470px at both viewports in
       * this file, which is 33% of 1440 — under the old share floor, and correctly so: a panel
       * sized to its content is a fixed column, and its share of a big screen is not a quantity
       * anybody should be holding a floor on. The rail's own share at 1440 was 30%, so a share
       * floor loose enough to admit this panel could not have failed against the rail either.
       *
       * So the pair is a pixel floor and a CONTENT floor. The rail was `min(430px, 42vw)`: 430px
       * at both of these, which is under 450 and — the part that matters — too narrow for the
       * declare step's middle action card to keep its description on one line.
       * `crisisPanelFitsItsContent.browser.test.tsx` owns the full form and the ceiling above it.
       */
      expect(box.width, "the panel is back to a rail's width").toBeGreaterThan(450);
      expect(
        Array.from(
          document.querySelectorAll<HTMLElement>(".winter-in-city .hw-action small"),
        ).map((small) => {
          const text = small.childNodes[0];
          if (!text) {
            throw new Error("an action card has no description to measure");
          }
          const range = document.createRange();
          range.selectNodeContents(text);
          return range.getClientRects().length;
        }),
        "the panel is too narrow for the declare step's own action cards",
      ).toEqual([2, 1, 2]);
      expect(
        findButton(panel(), /Commit and face/).getBoundingClientRect().bottom,
        "the commit control is below the panel's fold",
      ).toBeLessThanOrEqual(box.bottom + 1);

      // AND THE QUESTION PHASE, photographed because that is what the review asked to see.
      // A shield rather than the pull-back this declared, which was ruled out on 2026-08-02. It
      // is aimed through the island's own seam, which is how a player aims one in the city.
      findButton(panel(), /Reinforce a building/).click();
      await waitFor(() => published !== null, "the island was never handed a board");
      published?.onPickBuilding("NUM.S");
      await waitFor(
        () => !findButton(panel(), /Commit and face/).disabled,
        "the commit control never armed",
      );
      findButton(panel(), /Commit and face/).click();
      await waitFor(() => panel().dataset.phase === "answering", "the batch never opened");
      await document.fonts.ready;
      await new Promise<void>((resolve) => setTimeout(resolve, 900));
      await keep(`question-${view.width}x${view.height}`, await capture());
    },
    120000,
  );
}

/**
 * **THE SAME WINDOW, LESS ITS BROWSER CHROME — AND THE DECLARE STEP AT ITS WIDEST MOMENT.**
 *
 * Two gaps in the set above, and both are places a frame has been substituted for the thing it
 * was supposed to show.
 *
 *  - 1024x580 is the lead's WINDOW. The page inside it is about **507px** tall once the browser
 *    has taken its own chrome, and that is the box the panel is really laid out in. Sixty or
 *    seventy pixels of height is the difference between a declare step that fits and one that
 *    scrolls, and every `vh` in this surface resolves differently there;
 *  - the declare step is photographed at rest, and at rest it is not at its widest moment. With
 *    a cell aimed at, the commit read-out names that cell and `FirePreviewLadder` — the tallest
 *    read-out the panel ever carries — is under the cards.
 *
 * No measurements: the file above owns those, and this is here so a reviewer can look at the two
 * frames nothing else takes. It writes the viewport into the filename for the same reason the
 * rule about spatial claims asks for it — a frame whose viewport is unstated says nothing about
 * anybody's screen.
 */
test.runIf(SHOTS)(
  "photographs the declare step aiming, and the lead's window less its browser chrome",
  async () => {
    for (const view of [
      { width: 1024, height: 580 },
      { width: 1024, height: 507 },
    ] as const) {
      await openCrisisOverTheIsland(view);
      const at = `${view.width}x${view.height}`;
      await keep(`declare-${at}`, await capture());

      // Arm a fire and pick a cell the way the canvas does: `onAimCell` is the seam the board
      // reports a pick through, so this is the state a player reaches rather than a test-only one.
      findButton(panel(), /Light a fire/).click();
      await waitFor(() => panel().dataset.aiming === "true", "the panel never armed");
      await waitFor(() => published?.onAimCell != null, "the board never took a pick");
      published?.onAimCell?.(-1, 0);
      await waitFor(() => panel().dataset.aiming === "false", "no cell was picked");
      await document.fonts.ready;
      await new Promise<void>((resolve) => setTimeout(resolve, 900));
      expect(
        document.querySelector(".winter-in-city .hw-preview"),
        `no preview at ${at}, so this is a photograph of the resting panel again`,
      ).not.toBeNull();
      await keep(`declare-aiming-${at}`, await capture());

      h?.cleanup();
      h = null;
    }
  },
  240000,
);
