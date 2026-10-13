import { HARD_WINTER } from "@cr/game";
import { type ReactElement, useRef, useState } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";
import { resolveBuildingModel } from "../city/buildingAssets";
import { CURRENT_ERA_ID } from "../city/eraDressing";
import {
  applyCameraAction,
  controlsDistance,
  type OrbitControlsLike,
} from "../city/three/applyOrbit";
import { CityCanvasHost } from "../city/three/CityCanvasHost";
import type { ScenePlacement, SceneTownHall } from "../city/three/CityScene";
import { type WinterCityBoard, WinterInCity } from "../city/three/WinterInCity";
import { resolveTownHallModel, TOWN_HALL_ID } from "../city/townHall";
import type { PlacedTransform } from "../city/worldLayout";
import { materialWord } from "../economy/materialWord";
import {
  findButton,
  type Harness,
  mount,
  setInputValue,
  waitFor,
} from "../lessons/testHarness";
import { WINTER_NODE_ORDER, winterBatchFor, winterFrozenItem } from "./hardWinterItems";

import "../styles.css";
import { eraCityLayout } from "../city/islandLand";
import { wrongButReadable } from "../test/wrongButReadable";

/**
 * **THE ZERO-ACCURACY WINTER, ON THE ISLAND, BECAUSE A RULING NOW HAS A FACE.**
 *
 * `HARD_WINTER.damage.ruin_at: 2` shipped on 2026-08-01 (#374) and its own report flags the
 * consequence the lead ruled for and nobody had looked at: *"answer nothing and lose everything"
 * is literally true again: one cold round is a building and the frost reaches every band, so a
 * zero-accuracy winter now ends with **nothing standing** and reads `lost` on screen where it read
 * `mauled`."*
 *
 * `hard-winter.test.ts` asserts that as a measurement over the engine and `winterConclusion.test
 * .ts` grades the card's verdict over an authored board. Neither is a picture, and the standing
 * instruction for island and crisis design is that somebody sees the rendered result before it is
 * called finished. So this plays a whole winter at zero accuracy over a LIVE city, through the
 * real question surface with every answer really wrong, and photographs what the player is left
 * looking at.
 *
 * ## NOTHING HERE RETUNES ANYTHING
 *
 * This produces evidence for a decision rather than making one. If the screen reads harshly at
 * the bottom of the range, that is the finding, and the ruling on it is the lead's.
 *
 * ## THE ALWAYS-ON HALF IS THE CLAIM THE FRAMES ARE OF
 *
 * A frame set is only evidence about the state it was taken in, and *"nothing standing"* is a
 * claim about a board rather than about a picture. So the play, the outcome and the card's own
 * copy order are asserted in CI with no canvas at all, and the photographs are behind
 * `VITE_WINTER_SHOTS=1` for the reason `winterCrisisShots.browser.test.tsx` records: a heavy
 * shadow-mapped scene left switched on starves an animation-timing assertion in some other file
 * once per run, which is worse than having no photographs.
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's own short laptop window, named in every filename. */
const VIEW = { width: 1024, height: 580 } as const;

const LAYOUT = eraCityLayout("prehistoric");

/**
 * A live city, spread across the board, so *"nothing standing"* is a claim about a settlement.
 *
 * Era one's six skill buildings plus the hub, which `liveCityLayout` hands to the crisis as a
 * winter building like any other, so the roll below is seven tiles and the hall is one of them.
 */
const CITY: readonly PlacedTransform[] = [
  { nodeId: "NUM.S", col: -4, row: -3, rot: 0 },
  { nodeId: "NUM.F", col: 2, row: 3, rot: 0 },
  { nodeId: "NUM.2", col: 4, row: -1, rot: 0 },
  { nodeId: "NUM.3", col: -3, row: 2, rot: 0 },
  { nodeId: "NUM.4", col: 1, row: -4, rot: 0 },
  { nodeId: "NUM.5", col: -1, row: 0, rot: 0 },
];
const HALL: PlacedTransform = { nodeId: TOWN_HALL_ID, col: -1, row: -2, rot: 0 };

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
 * it as `winterRows` / `ruinedNodeIds` / `scarredCells`, so the island the frames are of is being
 * driven by the winter that is really being played rather than by a board this file built.
 */
function CityUnderWinter(): ReactElement {
  const [board, setBoard] = useState<WinterCityBoard | null>(null);
  const controlsRef = useRef<OrbitControlsLike | null>(null);
  controls = controlsRef;
  return (
    <div className="city-shell">
      <div className="city-surface" data-winter={board !== null ? "true" : "false"}>
        <div className="city-viewport" data-testid="city-viewport">
          <CityCanvasHost
            enableCanvas={SHOTS}
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
            ruinedCells={board?.scarredCells}
            frostStageByNodeId={board?.frostStageByNodeId}
            crisisThreatenedNodeIds={board?.threatenedNodeIds}
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
        onBoard={(next) => {
          setBoard(next);
          published = next;
        }}
        onExit={() => undefined}
      />
    </div>
  );
}

let h: Harness | null = null;
let published: WinterCityBoard | null = null;
let controls: { current: OrbitControlsLike | null } | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
    restore = null;
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
  published = null;
  controls = null;
  localStorage.clear();
});

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

const panel = (): HTMLElement => query<HTMLElement>(".winter-in-city .hw-shell");
const conclusion = (): HTMLElement => query<HTMLElement>(".hw-conclusion");

async function openCrisis(): Promise<void> {
  await page.viewport(VIEW.width, VIEW.height);
  h = mount(<CityUnderWinter />);
  await waitFor(
    () => document.querySelector(".winter-in-city .hw-shell") !== null,
    "the crisis panel never rendered",
    30000,
  );
  await document.fonts.ready;
}

/**
 * Play one round with EVERY ANSWER WRONG, through the surface's own controls.
 *
 * The wrong answer is the real key with a marker appended, so it fails through the real checker
 * rather than through a stub: this is a learner answering nothing right, not a state handed to the
 * reducer. `winterConclusionSheet.browser.test.tsx` drives its endings the same way.
 */
async function playRoundAtZero(
  round: number,
  cell: readonly [number, number],
): Promise<void> {
  findButton(panel(), /Light a fire/).click();
  await waitFor(() => published?.onAimCell != null, "the board takes a cell pick");
  published?.onAimCell?.(cell[0], cell[1]);
  await waitFor(() => !findButton(panel(), /Commit and face/).disabled, "commit arms");
  findButton(panel(), /Commit and face/).click();
  await waitFor(() => panel().dataset.phase === "answering", "the batch opens");

  const batch = winterBatchFor({
    masteredNodeIds: WINTER_NODE_ORDER,
    encounter: 1,
    round,
  });
  if (batch.status !== "ready") {
    throw new Error(`no batch for round ${round}`);
  }
  const keys = batch.prompts.map((prompt) => {
    const key = winterFrozenItem(prompt.item_version_id)?.answer.answer_key;
    if (typeof key !== "string") {
      throw new Error(`no text answer key for ${prompt.item_version_id}`);
    }
    return key;
  });

  for (const [index, key] of keys.entries()) {
    setInputValue(
      query<HTMLInputElement>(".winter-in-city .hw-panel input"),
      wrongButReadable(key),
    );
    await waitFor(() => !findButton(panel(), /^Check$/).disabled, "Check arms");
    findButton(panel(), /^Check$/).click();
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-verdict") !== null,
      "a verdict lands",
    );
    findButton(panel(), /See what you earned|Next question/).click();
    await waitFor(
      () =>
        index + 1 >= keys.length
          ? panel().dataset.phase !== "answering"
          : document.querySelector(".winter-in-city .hw-verdict") === null,
      "the batch moves on",
    );
  }

  if (panel().dataset.phase === "resolved") {
    findButton(panel(), /Let the frost advance/).click();
    await waitFor(
      () => panel().dataset.phase !== "resolved",
      "the frost advances out of resolved",
    );
  }
}

/**
 * The whole winter at zero accuracy: a fire on the settlement's own heart, every round.
 *
 * A declaration rather than a pull-back, and the same one every round, so the play is *"they
 * tried the obvious thing and answered nothing right"* rather than a plan. At the `none` tier a
 * fire is still LIT and warms no ground (`devSkipTiers.test.ts` measures that rung as holding
 * zero cells), which is the design's own rule that accuracy is magnitude and never permission.
 */
async function playTheWholeWinterAtZero(): Promise<void> {
  for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
    await playRoundAtZero(round, [0, 0]);
  }
  await waitFor(() => panel().dataset.phase === "ended", "the winter ends", 30000);
  await waitFor(
    () => document.querySelector(".hw-conclusion") !== null,
    "the card appears",
  );
  await document.fonts.ready;
}

/* -------------------------------------------------------------------------- */
/* The claim the frames are of                                                */
/* -------------------------------------------------------------------------- */

test("a whole winter answered wrong leaves nothing standing and reads lost", async () => {
  await openCrisis();
  await playTheWholeWinterAtZero();

  const card = conclusion();
  expect(card.dataset.verdict, "this play did not reach the bottom of the range").toBe(
    "lost",
  );

  // NOTHING STANDING, read off the card's own roll rather than off the engine, because the roll
  // is what the player is looking at. Floored at the whole settlement, hub included, so a roll
  // that lost tiles cannot pass by having less to report.
  const tiles = Array.from(card.querySelectorAll<HTMLElement>(".hw-roll-tiles li"));
  expect(tiles, "the roll is not the whole settlement").toHaveLength(CITY.length + 1);
  expect(
    tiles.filter((tile) => tile.dataset.state === "ruin"),
    `${tiles.filter((t) => t.dataset.state !== "ruin").length} buildings are still standing, so this is not the total-loss ending`,
  ).toHaveLength(tiles.length);

  // AND THE ISLAND AGREES WITH THE CARD, at the moment the card is on screen: every building the
  // roll calls a ruin is a ruin on the board the canvas was handed. The frames are of that
  // island, so a card that reported a loss over an untouched island would be a frame of the
  // wrong thing.
  expect(published?.ended, "the island was never told the winter ended").toBe(true);
  expect(
    published?.ruinedNodeIds.size,
    "the ruins the card lists are not on the island",
  ).toBe(tiles.length);

  // AND EVERY QUESTION REALLY WENT WRONG, so "zero accuracy" is a measurement and not a label.
  expect(card.textContent).toContain(
    `You answered 0 of ${HARD_WINTER.rounds * HARD_WINTER.batch_size} right`,
  );

  /*
   * THE COPY ORDER AT THE BOTTOM OF THE RANGE, which is the standing rule for crisis copy: it
   * may not lead with the penalty. Asserted as DOM ORDER rather than as a wording match,
   * because the rule is about what a player reads first and any sentence can be reworded.
   *
   * The event comes first, then what happened, and only then what it costs. `WinterConclusion
   * .tsx` argues that split as the reason the eyebrow and the headline are two elements, and
   * this is the assertion that the argument survives at the one grade where the bill is
   * largest.
   */
  const order = (selector: string): number => {
    const element = query<HTMLElement>(selector);
    const all = Array.from(card.querySelectorAll<HTMLElement>("*"));
    return all.indexOf(element);
  };
  const eyebrow = order(".hw-conclusion__eyebrow");
  const verdict = order(".hw-conclusion__verdict");
  const bill = order(".hw-conclusion__bill");
  expect(eyebrow, "the card does not open with the event").toBeLessThan(verdict);
  expect(verdict, "the card leads with the bill rather than with the outcome").toBeLessThan(
    bill,
  );
  // And the bill is real at this grade, so the ordering claim is not about a sentence that is
  // absent: a total loss has something to put right.
  expect(query<HTMLElement>(".hw-conclusion__bill").textContent).toMatch(
    new RegExp(`costs \\d+ ${materialWord(CURRENT_ERA_ID)}`),
  );
  // The headline is the outcome and not a scolding, and not a celebration either.
  expect(query<HTMLElement>(".hw-conclusion__verdict").textContent).toBe(
    "Nothing came through the winter.",
  );
}, 240000);

/* -------------------------------------------------------------------------- */
/* The frames                                                                 */
/* -------------------------------------------------------------------------- */

/** Where this test's viewport sits in the browser window, so a capture can be clipped to it. */
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
 * The composited frame, over CDP.
 *
 * `page.screenshot` is Playwright's locator capture and never gets past *"waiting for element to
 * be stable"* over a canvas running `frameloop="always"`; `winterIslandVisible.browser.test.tsx`
 * records the same finding.
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

async function keep(name: string, shot: string): Promise<void> {
  if (SHOTS) {
    await commands.writeFile(
      `apps/web/src/winter/__screenshots__/zero-accuracy/${name}.png`,
      shot,
      { encoding: "base64" },
    );
  }
}

/** Width and height out of a PNG's IHDR, so a scaled capture cannot pass for the viewport. */
function pngSize(base64: string): { width: number; height: number } {
  const binary = atob(base64);
  const at = (i: number): number => binary.charCodeAt(i) & 0xff;
  const read = (offset: number): number =>
    (at(offset) << 24) | (at(offset + 1) << 16) | (at(offset + 2) << 8) | at(offset + 3);
  expect(binary.slice(1, 4), "not a PNG").toBe("PNG");
  return { width: read(16) >>> 0, height: read(20) >>> 0 };
}

/** Notches of the player's own zoom control the close frame is taken at. */
const ZOOM_NOTCHES = 3;

test.runIf(SHOTS)(
  `photographs the zero-accuracy winter at ${VIEW.width}x${VIEW.height}`,
  async () => {
    await openCrisis();
    await waitFor(
      () => document.querySelector(".city-viewport canvas") !== null,
      "the city canvas never mounted",
      40000,
    );
    await playTheWholeWinterAtZero();
    // The board is republished on the way into `ended`, the island thaws, seven ruin models swap
    // in behind their own Suspense boundaries and the scarred ground rebuilds, so the frame has
    // to be given time to become the one the card is commenting on.
    await new Promise<void>((resolve) => setTimeout(resolve, 3500));
    /*
     * A THROWAWAY CAPTURE, and it is load-bearing. `Page.captureScreenshot` with a `clip` puts a
     * device-metrics override on the page, which R3F reads as a resize, so the first clipped
     * capture after a mount comes back as the frame drawn before any of that settled.
     */
    await capture();
    await new Promise<void>((resolve) => setTimeout(resolve, 800));

    // 1. THE CONCLUSION SCREEN, over the island it is reporting on. Not cropped to the message:
    //    "nothing standing" is a claim about the island, so the island is in the frame.
    const withCard = await capture();
    await keep(`${VIEW.width}x${VIEW.height}-conclusion-lost-over-the-island`, withCard);

    // 2. THE BOARD AT THE END, same camera and same instant, with the overlay out of the way.
    const overlay = document.querySelector<HTMLElement>(".winter-in-city");
    if (!overlay) {
      throw new Error("the winter's overlay never mounted, so there is nothing to hide");
    }
    overlay.style.visibility = "hidden";
    let island: string;
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      island = await capture();
    } finally {
      overlay.style.visibility = "";
    }
    await keep(`${VIEW.width}x${VIEW.height}-island-nothing-standing`, island);

    // 3. AND THE SAME ISLAND AT THE PLAYER'S OWN ZOOM, because "is it on screen" and "what is
    //    left of my city" are different questions and a crop would answer the second by throwing
    //    away the first.
    const orbit = controls?.current;
    if (!orbit) {
      throw new Error("the canvas never handed its controls out, so nothing can be zoomed");
    }
    const wide = controlsDistance(orbit);
    for (let notch = 0; notch < ZOOM_NOTCHES; notch += 1) {
      applyCameraAction(orbit, "zoomIn");
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 1200));
    expect(
      controlsDistance(orbit),
      "the player's zoom control moved the camera nowhere",
    ).toBeLessThan(wide);
    await capture();
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    overlay.style.visibility = "hidden";
    let closeIsland: string;
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      closeIsland = await capture();
    } finally {
      overlay.style.visibility = "";
    }
    await keep(`${VIEW.width}x${VIEW.height}-island-nothing-standing-zoomed`, closeIsland);

    const frames = [
      ["conclusion", withCard],
      ["island", island],
      ["island-zoomed", closeIsland],
    ] as const;
    for (const [name, shot] of frames) {
      const size = pngSize(shot);
      expect(size.width, `${name} came back ${size.width}px wide`).toBe(VIEW.width);
      expect(size.height, `${name} came back ${size.height}px tall`).toBe(VIEW.height);
    }
    // AND NO TWO OF THE THREE ARE THE SAME FRAME. Byte-identical captures are how a stale canvas
    // layer passes for a second witness, which this exact instrument has produced before.
    for (const [a, aShot] of frames) {
      for (const [b, bShot] of frames) {
        if (a >= b) {
          continue;
        }
        expect(aShot === bShot, `${a} is byte-identical to ${b}`).toBe(false);
      }
    }
  },
  300000,
);
