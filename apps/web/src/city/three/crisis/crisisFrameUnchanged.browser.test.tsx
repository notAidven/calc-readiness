import { type ReactElement, useRef, useState } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../../lessons/testHarness";
import { WINTER_NODE_ORDER } from "../../../winter/hardWinterItems";
import { resolveBuildingModel } from "../../buildingAssets";
import { CURRENT_ERA_ID } from "../../eraDressing";
import { resolveTownHallModel } from "../../townHall";
import type { PlacedTransform } from "../../worldLayout";
import type { OrbitControlsLike } from "../applyOrbit";
import { CityCanvasHost } from "../CityCanvasHost";
import type { ScenePlacement, SceneTownHall } from "../CityScene";
import { type WinterCityBoard, WinterInCity } from "../WinterInCity";

import "../../../styles.css";
import { eraCityLayout } from "../../islandLand";

/**
 * **ERA ONE'S WINTER, PHOTOGRAPHED, SO "NOTHING MOVED" IS A PICTURE AND NOT AN ARITHMETIC CLAIM.**
 *
 * This pass routed the sky, the fog, the exposure, all four lights and the crisis badge's height
 * through new seams. Every one of those is a claim about a FRAME, and the unit guards can only
 * say that the numbers coming out of the resolvers are the numbers that went in. A resolver can
 * be right and the wiring wrong: a preset resolved correctly and then handed to the wrong prop
 * would pass `crisisAtmosphere.test.ts` completely and light the island as a summer afternoon.
 *
 * So this mounts the composition `CitySurface` mounts — the real canvas, the real camera, the
 * real island, the settlement's real GLBs and the crisis panel over them — and captures the
 * composited screen.
 *
 * ## THE VIEWPORT IS 1024x580 AND IT IS NAMED FOR A REASON
 *
 * It is the team lead's own window, measured off his screenshot, and `winterIslandVisible
 * .browser.test.tsx` records why the number matters: *"sixty pixels of height is the difference
 * between a layout that fits and one that does not, and the whole history of this panel is a
 * review passing at a developer's window and failing at his."* A frame taken at a comfortable
 * developer viewport would be as misleading here as the arithmetic it is standing in for.
 *
 * **The frame is not cropped to anything that changed.** The subject is the whole surface: the
 * island behind the panel, the sea, the sky and the settlement. A capture cropped to the badge
 * would prove nothing about the light falling on the island, which is the half this pass touched.
 *
 * ## IT IS OFF BY DEFAULT, for the reason its neighbours record
 *
 * Run `VITE_WINTER_SHOTS=1 npm run test:browser` to take the picture. Two shadow-mapped scenes
 * with seven GLBs is heavy, and a heavy scene left on in this suite starves an animation-timing
 * assertion in a different file rather than failing here — which is worse than not having the
 * photograph, because the next reader cannot tell it from a real regression.
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's short window. Named beside every number this file reports. */
const SHORT_LAPTOP = { width: 1024, height: 580 } as const;

const LAYOUT = eraCityLayout("prehistoric");

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
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

/** Era one's six skills plus the hall, spread across the board so the frame is the settlement. */
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

/** The city and the crisis, wired the way `CitySurface` wires them. */
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

/** Where this test's viewport sits inside the browser window, so a clip lands on it. */
function testViewportBox(): { x: number; y: number; width: number; height: number } {
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
  };
}

/**
 * The composited frame, clipped to this test's viewport, as a base64 PNG.
 *
 * CDP rather than `page.screenshot`, which is Playwright's locator capture and never gets past
 * *"waiting for element to be stable"* against a canvas running `frameloop="always"`.
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

/** A captured PNG, decoded to pixels. */
async function frame(
  base64: string,
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
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
 * **THE FRAME REDUCED TO A GRID OF TILE MEANS, which is what makes it comparable across runs.**
 *
 * A raw pixel hash is not a usable instrument here: the scene is GPU-rasterised with a shadow
 * map, so two runs of the SAME tree differ in a scatter of pixels along every shadow edge.
 * Twelve by eight tile means over the whole frame are stable to well under a channel step across
 * runs, and they still move by tens of channel steps if the sky, the exposure or any of the four
 * lights changes — because every one of those is a change to most of the frame at once.
 *
 * Printed rather than only asserted, so a before/after pair can be diffed by eye or by a reader
 * comparing two run logs.
 */
function tileMeans(sample: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}): number[] {
  const COLS = 12;
  const ROWS = 8;
  const means: number[] = [];
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const x0 = Math.floor((tx * sample.width) / COLS);
      const x1 = Math.floor(((tx + 1) * sample.width) / COLS);
      const y0 = Math.floor((ty * sample.height) / ROWS);
      const y1 = Math.floor(((ty + 1) * sample.height) / ROWS);
      let total = 0;
      let n = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const i = (y * sample.width + x) * 4;
          total +=
            (sample.data[i] as number) +
            (sample.data[i + 1] as number) +
            (sample.data[i + 2] as number);
          n += 3;
        }
      }
      means.push(n === 0 ? 0 : total / n);
    }
  }
  return means;
}

async function keep(name: string, shot: string): Promise<void> {
  if (SHOTS) {
    await commands.writeFile(
      `apps/web/src/city/three/__screenshots__/crisis-framework/${name}.png`,
      shot,
      { encoding: "base64" },
    );
  }
}

test.runIf(SHOTS)(
  "era one's winter island, at 1024x580, with the seams in the path",
  { timeout: 180000 },
  async () => {
    await page.viewport(SHORT_LAPTOP.width, SHORT_LAPTOP.height);
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
    // the board arrives, so a first frame is a bare island.
    await new Promise<void>((resolve) => setTimeout(resolve, 2500));
    // A throwaway capture: a clipped `Page.captureScreenshot` puts a device-metrics override on
    // the page, which R3F reads as a resize and re-renders through. See the neighbour's note.
    await capture();
    await new Promise<void>((resolve) => setTimeout(resolve, 600));

    const shot = await capture();
    await keep("winter-island-1024x580", shot);
    const sample = await frame(shot);

    // The board really reached the canvas. Without this the picture below could be a
    // fair-weather island under a crisis panel, and every number in it would be about the
    // wrong frame.
    expect(published, "the winter published no board").not.toBeNull();
    expect(document.querySelector('.city-surface[data-winter="true"]')).not.toBeNull();

    const means = tileMeans(sample);
    expect(means).toHaveLength(96);
    // Written beside the picture rather than logged, so a before/after pair is a file diff
    // rather than two run logs somebody has to line up by eye.
    if (SHOTS) {
      await commands.writeFile(
        "apps/web/src/city/three/__screenshots__/crisis-framework/winter-island-1024x580.tiles.json",
        `${JSON.stringify(
          {
            viewport: SHORT_LAPTOP,
            captured: { width: sample.width, height: sample.height },
            tiles: means.map((m) => Number(m.toFixed(2))),
          },
          null,
          2,
        )}\n`,
      );
    }

    // A floor on the picture itself, so a blank or a black frame cannot be reported as a
    // match: the winter is an OVERCAST DAY, so most of the frame is pale, and nothing in it is
    // the fair-weather sky's saturated blue.
    const overall = means.reduce((a, b) => a + b, 0) / means.length;
    expect(overall, "the frame is too dark to be an overcast day").toBeGreaterThan(60);
    expect(overall, "the frame is blown out").toBeLessThan(250);
    const varied = new Set(means.map((m) => Math.round(m))).size;
    expect(varied, "the frame is one flat colour, so nothing was drawn").toBeGreaterThan(
      12,
    );
  },
);
