import { ERA_SEQUENCE, type EraId, eraNumber } from "@cr/skill-graph";
import type { RefObject } from "react";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";
import { ringLayout } from "../../catchup/ringLayout";
import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { resolveBuildingModel } from "../buildingAssets";
import { eraCityLayout } from "../islandLand";
import {
  resolveTownHallModel,
  TOWN_HALL_CENTER_TRANSFORM,
  TOWN_HALL_ID,
} from "../townHall";
import type { PlacedTransform } from "../worldLayout";
import type { OrbitControlsLike } from "./applyOrbit";
import type CityScene from "./CityScene";
import type { ActivePlacement, ScenePlacement, SceneTownHall } from "./CityScene";

/**
 * **DOES THE ISLAND READ AS A PLACE OR AS A PLANE? PHOTOGRAPHED, WHOLE ISLAND IN SHOT, AT
 * 1024x580, WITH THE CITY THE LEAD ACTUALLY HAD AND WITH THE ONE THE DEMO WILL HAVE.**
 *
 * The lead, having advanced an era and watched the island grow: *"the graphics also are cooked
 * after the age advances / the island expands."*
 *
 * `islandDressingReachesTheShore.browser.test.tsx` already photographs the island at three eras
 * and is the right file for *"do the plants reach the shore."* It photographs an **empty city**
 * only (`placed={[]}`, no hall), and the two halves of this complaint are exactly the ones an
 * empty island cannot answer:
 *
 *  - **how much of the island the player's own buildings cover**, which is the whole of #544's
 *    counter-argument for growing the buildable disc — the interior fills with the city — and
 *    which is false for a learner who has placed one thing;
 *  - **what the permanent grid looks like over ground nothing stands on**, which is what makes
 *    an empty middle read as an unfinished build site rather than as a field.
 *
 * So every era below is shot TWICE: once with the pre-seeded Civic Center alone, which is
 * `citySession`'s own cold-open state and the lead's frame, and once with the whole cumulative
 * roster seated by the shipped auto-layout.
 *
 * ## The viewport is half the evidence, and it is 1024x580
 *
 * The lead reviews in a short window, and every filename says so. The harness is
 * `islandDressingReachesTheShore`'s, kept deliberately identical so the two files' frames are
 * comparable: a fixed-size container rather than `page.viewport` alone, the shipped `CityScene`
 * rather than a canvas of this file's own, reduced motion, a two-identical-captures stability
 * gate, and one WebGL context per era.
 *
 * ## ⚑ OFF BY DEFAULT, for the reason its siblings record
 *
 *     VITE_ISLAND_PLACE_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *       apps/web/src/city/three/islandReadsAsAPlace.browser.test.tsx
 *
 * A heavy WebGL scene left always-on in this suite starves a neighbour's timing assertion on a
 * two-core runner rather than failing here. What is NOT gated is the measurement:
 * `islandBareInterior.test.ts` holds the radial distribution at every era with no GPU at all.
 *
 * The frames are COMMITTED, to `docs/design-refs/island-reads-as-a-place/` and copied to
 * `output/`.
 */

/** Off by default; see the header. */
const SHOTS = Boolean(import.meta.env.VITE_ISLAND_PLACE_SHOTS);

/** Loaded on demand so a plain run never pulls the whole scene graph into this file. */
async function loadScene(): Promise<typeof CityScene> {
  return (await import("./CityScene")).default;
}

/** The lead's window, and the only one this file photographs. */
const LEAD_WINDOW = { width: 1024, height: 580 } as const;

/**
 * The eras photographed, and why these three.
 *
 * Era one is the CONTROL — shipped, approved art, the island nobody complained about. Era two is
 * the first grown island and the one the lead's own frame is of. Era six is the DEMO's own age
 * (`eraPlacementFromSeed` hands a learner placed there five ages, so they walk into era six),
 * it sits at the growth ceiling of grass 46, and it has no authored ground props — so it is both
 * the demo path and the naked case.
 */
const ERAS = [
  "prehistoric",
  "neolithic",
  "renaissance",
] as const satisfies readonly EraId[];

const CANVAS_WAIT_MS = 20000;
const SHOT_TEST_TIMEOUT_MS = 240000;

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

type Sample = { data: Uint8ClampedArray; width: number; height: number; png: string };

const STAGE_ID = "island-place-stage";

/** Where the scene's container sits in the real page, so a clip is the canvas and nothing else. */
function stageBox(): { x: number; y: number; width: number; height: number } {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const stage = document.getElementById(STAGE_ID);
  if (!stage) {
    throw new Error("the scene's container is not mounted, so there is nothing to clip to");
  }
  const frame = frameElement.getBoundingClientRect();
  if (Math.abs(frame.width - window.innerWidth) > 2) {
    throw new Error(
      `the tester iframe is scaled (${frame.width}px of page for ${window.innerWidth}px of ` +
        "document), so a clip in CSS pixels would not be one in page pixels",
    );
  }
  if (frame.width < LEAD_WINDOW.width || frame.height < LEAD_WINDOW.height) {
    throw new Error(
      `the browser window is ${frame.width}x${frame.height}, smaller than the ` +
        `${LEAD_WINDOW.width}x${LEAD_WINDOW.height} this file photographs`,
    );
  }
  const inner = stage.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: frame.left + outer.scrollX + inner.left,
    y: frame.top + outer.scrollY + inner.top,
    width: inner.width,
    height: inner.height,
  };
}

/**
 * The composited frame, clipped to the scene's container.
 *
 * CDP rather than a canvas read-back: `CityScene` is the shipped scene and its `Canvas` carries
 * no `preserveDrawingBuffer`, so adding one would photograph a canvas configured differently
 * from the one the game ships.
 */
async function capture(): Promise<string> {
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const box = stageBox();
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
  });
  if (!shot.data) {
    throw new Error("CDP returned no screenshot data");
  }
  return shot.data;
}

async function decode(base64: string): Promise<Sample> {
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
    png: base64,
  };
}

function differingPixels(a: Sample, b: Sample): number {
  let differing = 0;
  for (let at = 0; at < a.data.length; at += 4) {
    if (
      Math.abs((a.data[at] ?? 0) - (b.data[at] ?? 0)) > 2 ||
      Math.abs((a.data[at + 1] ?? 0) - (b.data[at + 1] ?? 0)) > 2 ||
      Math.abs((a.data[at + 2] ?? 0) - (b.data[at + 2] ?? 0)) > 2
    ) {
      differing += 1;
    }
  }
  return differing;
}

/* -------------------------------------------------------------------------- */
/* The two cities                                                             */
/* -------------------------------------------------------------------------- */

/** The pre-seeded hub every island carries from the start (`citySession.ts`). */
const HALL: PlacedTransform = { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };

const SCENE_HALL: SceneTownHall = {
  ...TOWN_HALL_CENTER_TRANSFORM,
  model: resolveTownHallModel("built"),
  celebrateToken: 0,
};

/** Every node of every era up to and including `era` — what a played-through learner has. */
function rosterThrough(era: EraId): readonly string[] {
  return ERA_SEQUENCE.slice(0, eraNumber(era)).flatMap((entry) => entry.nodes);
}

/**
 * The whole cumulative roster, seated by the SHIPPED auto-layout on the disc the era's own
 * layout reports.
 *
 * `layout.buildableRadius` rather than a constant: on `integration` that is era one's 22 at
 * every era, and on #544's tree it is the era's own disc. Reading it off the layout is what
 * makes this file's frames comparable across the two trees without a line changing.
 */
function fullCity(eraId: EraId): readonly ScenePlacement[] {
  const { buildableRadius } = eraCityLayout(eraId);
  const seated = ringLayout({
    nodeIds: rosterThrough(eraId),
    reserved: [HALL],
    buildableRadius,
  });
  return seated.placed.map((placement) => ({
    nodeId: placement.nodeId,
    col: placement.col,
    row: placement.row,
    rot: placement.rot,
    model: resolveBuildingModel(placement.nodeId, "built"),
    mastery: 2,
    celebrateToken: 0,
  }));
}

/** The lead's own city: the pre-seeded hub and nothing else. */
const COLD_OPEN: readonly ScenePlacement[] = [];

/* -------------------------------------------------------------------------- */
/* The frame                                                                  */
/* -------------------------------------------------------------------------- */

/** One moment to photograph: which city stands on the island, and whether a plot is being sited. */
interface Moment {
  readonly placed: readonly ScenePlacement[];
  readonly placing: boolean;
}

/** The active placement the "placing" frames site, a few cells out from the hub. */
const SITING: ActivePlacement = { nodeId: "NUM.2", col: 3, row: 2, rot: 0, valid: true };

function Host({
  Scene,
  eraId,
  moment,
  controlsRef,
}: {
  readonly Scene: typeof CityScene;
  readonly eraId: EraId;
  readonly moment: Moment;
  readonly controlsRef: RefObject<OrbitControlsLike | null>;
}) {
  return (
    <div
      id={STAGE_ID}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: LEAD_WINDOW.width,
        height: LEAD_WINDOW.height,
        overflow: "hidden",
      }}
    >
      <Scene
        layout={eraCityLayout(eraId)}
        placed={moment.placed}
        townHall={SCENE_HALL}
        variant="day"
        reducedMotion
        controlsRef={controlsRef}
        onSelect={() => undefined}
        eraId={eraId}
        placing={moment.placing}
        placement={moment.placing ? SITING : null}
        ghostModelUrl={
          moment.placing
            ? (resolveBuildingModel(SITING.nodeId, "built")?.url ?? null)
            : null
        }
      />
    </div>
  );
}

/** One era's scene, mounted once and re-rendered between captures. */
async function sceneFor(eraId: EraId): Promise<{
  at: (moment: Moment) => Promise<Sample>;
}> {
  const Scene = await loadScene();
  const controlsRef: RefObject<OrbitControlsLike | null> = { current: null };
  await page.viewport(LEAD_WINDOW.width, LEAD_WINDOW.height);
  h?.cleanup();
  const render = (moment: Moment) => (
    <Host Scene={Scene} eraId={eraId} moment={moment} controlsRef={controlsRef} />
  );
  const harness = mount(render({ placed: COLD_OPEN, placing: false }));
  h = harness;
  await waitFor(
    () => document.querySelector("canvas") !== null,
    `the scene never mounted for ${eraId}`,
    CANVAS_WAIT_MS,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  // A throwaway capture first: a clipped `Page.captureScreenshot` puts a device-metrics
  // override on the page, which R3F reads as a resize and re-renders through.
  await capture();

  return {
    at: async (moment) => {
      harness.root.render(render(moment));
      await new Promise<void>((resolve) => setTimeout(resolve, 900));
      let previous = await decode(await capture());
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, 250));
        const next = await decode(await capture());
        if (differingPixels(previous, next) === 0) {
          return next;
        }
        previous = next;
      }
      throw new Error(
        `the frame never settled for ${eraId}, so nothing measured here is repeatable`,
      );
    },
  };
}

/**
 * Both destinations, per this repository's convention for committed frames: the reference copy
 * under `docs/design-refs/`, and a copy under `output/` where the lead looks.
 */
const KEEP_IN = [
  "docs/design-refs/island-reads-as-a-place",
  "output/island-reads-as-a-place",
] as const;

/**
 * A prefix for the run, so one harness can photograph several trees into one directory without
 * a file being overwritten by the next tree's copy of it. Empty for the tree under review.
 */
const TAG = import.meta.env.VITE_ISLAND_PLACE_TAG ?? "";

async function keep(name: string, frame: Sample): Promise<void> {
  for (const directory of KEEP_IN) {
    if (SHOTS) {
      await commands.writeFile(`${directory}/${TAG}${name}.png`, frame.png, {
        encoding: "base64",
      });
    }
  }
}

test("photographs the lead's own short window, over eras and cities that really differ", () => {
  expect(`${LEAD_WINDOW.width}x${LEAD_WINDOW.height}`).toBe("1024x580");
  // A FLOOR under the whole file: the three eras are drawn on three DIFFERENT islands, so a
  // set of frames that all looked alike would be a finding rather than a pass.
  const radii = ERAS.map((era) => eraCityLayout(era).islandRadius);
  expect(new Set(radii).size).toBe(ERAS.length);
  expect(radii).toEqual([30, 38, 46]);
  // ...and the two cities are really two cities, at every era, with the later ones bigger.
  const cities = ERAS.map((era) => fullCity(era).length);
  expect(COLD_OPEN.length).toBe(0);
  for (const seated of cities) {
    expect(seated).toBeGreaterThan(3);
  }
  expect(cities[2] as number).toBeGreaterThan(cities[0] as number);
  // ...and they are eras the sequence actually has, in its own order.
  const order = ERA_SEQUENCE.map((era) => era.id);
  expect(ERAS.every((era) => order.includes(era))).toBe(true);
});

for (const eraId of ERAS) {
  test.runIf(SHOTS)(
    `the island at rest and while placing — ${eraId} at ${LEAD_WINDOW.width}x${LEAD_WINDOW.height}`,
    async () => {
      const scene = await sceneFor(eraId);

      const cold = await scene.at({ placed: COLD_OPEN, placing: false });
      expect(cold.width).toBe(LEAD_WINDOW.width);
      expect(cold.height).toBe(LEAD_WINDOW.height);
      await keep(`${eraId}-cold-open-1024x580`, cold);

      const full = await scene.at({ placed: fullCity(eraId), placing: false });
      expect(full.width).toBe(LEAD_WINDOW.width);
      await keep(`${eraId}-full-roster-1024x580`, full);

      // ⚑ THE OTHER HALF OF THE GRID CLAIM. Hiding an affordance outside its mode is only
      // defensible if it is there INSIDE the mode, so the cold-open island is photographed
      // again with a plot being sited on it — same city, same camera, one flag apart.
      const siting = await scene.at({ placed: COLD_OPEN, placing: true });
      expect(siting.width).toBe(LEAD_WINDOW.width);
      await keep(`${eraId}-placing-1024x580`, siting);
    },
    SHOT_TEST_TIMEOUT_MS,
  );
}
