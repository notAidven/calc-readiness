import { type ReactElement, useRef, useState } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import {
  findButton,
  type Harness,
  mount,
  setInputValue,
  waitFor,
} from "../../lessons/testHarness";
import {
  WINTER_NODE_ORDER,
  winterBatchFor,
  winterFrozenItem,
} from "../../winter/hardWinterItems";
import { resolveBuildingModel } from "../buildingAssets";
import { CURRENT_ERA_ID } from "../eraDressing";
import { eraCityLayout } from "../islandLand";
import { resolveTownHallModel } from "../townHall";
import type { PlacedTransform } from "../worldLayout";
import type { OrbitControlsLike } from "./applyOrbit";
import { CityCanvasHost } from "./CityCanvasHost";
import type { ScenePlacement, SceneTownHall } from "./CityScene";
import { type WinterCityBoard, WinterInCity } from "./WinterInCity";
import { crisisPanelReach } from "./winterFraming";

import "../../styles.css";
import "../../winter/hard-winter.css";
import "./winter-in-city.css";
import { wrongButReadable } from "../../test/wrongButReadable";

/**
 * **THE THREE CRISIS STATES OVER THE BUILDINGS, AND A BUILDING FREEZING SAYING SO.**
 *
 * The lead, having played the Hard Winter:
 *
 *  - *"during the crisis, instead of the name of the building (e.g signed numbers) should be
 *    replaced by status: e.g shielded, in danger (freezes on next turn without protection), or
 *    frozen."*
 *  - *"there also needs to be some kind of notification/pop up when a city is forzen so users
 *    know."*
 *
 * Both are claims about what is ON SCREEN, so both owe a frame rather than a passing test.
 * `crisisLabels.test.ts` and `winterFrozenNotice.test.tsx` own the behaviour and run in CI; this
 * is the photograph, at 1024x580 under reduced motion, taken through the shipped renderer with
 * the crisis played through its own panel.
 *
 * **THE COMPOSITE IS THE SUBJECT HERE, unlike `frostFront.browser.test.tsx`.** There the frost is
 * on the canvas and the DOM overlay had to come off to photograph it; the labels and the notice
 * ARE DOM, so the frame that matters is the one with everything on it. The island-only capture is
 * kept beside each because a canvas layer under a full-screen overlay comes back stale, and
 * having both is what tells a reader which layer they are looking at.
 *
 * Off by default; run `VITE_WINTER_SHOTS=1 npm run test:browser` to take them.
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's actual window. Short, which is where a bottom-band layout hides things. */
const HIS_WINDOW = { width: 1024, height: 580 } as const;

const LAYOUT = eraCityLayout("prehistoric");

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

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
});

function placed(nodeId: string, col: number, row: number): PlacedTransform {
  return { nodeId, col, row, rot: 0 };
}

/**
 * Era one's six skills plus the hall, spread across the board.
 *
 * Spread rather than packed on purpose: the frost front is a RING, so a city bunched at the
 * centre would leave the whole front out in empty snow where nothing tests whether it reads
 * against the settlement.
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
 * The city and the crisis, wired the way `CitySurface` wires them, so the board on the canvas
 * is the board the panel is playing rather than one this file made up.
 */
function CityUnderWinter({
  onBoard,
}: {
  readonly onBoard: (board: WinterCityBoard | null) => void;
}): ReactElement {
  const [board, setBoard] = useState<WinterCityBoard | null>(null);
  const controlsRef = useRef<OrbitControlsLike | null>(null);
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
            /* The three sets `CitySurface` passes and `frostFront.browser.test.tsx`'s
               harness does not, because it photographs the GROUND. The labels are the
               subject here, so the composition has to be the product's. */
            shieldedNodeIds={board?.shieldedNodeIds}
            reinforceCandidates={board?.reinforceCandidates}
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
          onBoard(next);
        }}
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

/** How many land cells on the published board carry `flag`. */
function countCells(
  board: WinterCityBoard,
  flag: (cell: WinterCityBoard["rows"][number][number]) => boolean,
): number {
  let total = 0;
  for (const line of board.rows) {
    for (const cell of line) {
      if (cell.land && flag(cell)) {
        total += 1;
      }
    }
  }
  return total;
}

/**
 * WHERE THIS TEST'S VIEWPORT SITS INSIDE THE BROWSER WINDOW.
 *
 * Vitest runs the test in an iframe on a tester page and SCALES that iframe when the requested
 * viewport is larger than the window, so `window.innerWidth` and the real screen pixels
 * disagree. Every capture is clipped to this box, which is what makes an image pixel divide
 * cleanly back into a CSS pixel of the viewport the assertions are written in.
 */
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
 * CDP rather than `page.screenshot`, which is Playwright's LOCATOR capture and never gets past
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

async function keep(name: string, shot: string): Promise<void> {
  if (SHOTS) {
    await commands.writeFile(`docs/design-refs/hard-winter-crisis-qa/${name}.png`, shot, {
      encoding: "base64",
    });
  }
}

/** A captured PNG, decoded to pixels this test can read. */
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
 * WHERE THE FROST FRONT IS DRAWN, read off a frame.
 *
 * The front is the only thing in a winter frame that is strongly BLUE rather than teal or pale:
 * it is `WINTER_GROUND_TONES.frostFront` at three value steps, and everything else cold in the
 * scene is either near-white (snow, sheet ice, frost) or teal (`WATER_COLD`, whose green and blue
 * channels sit within about ten of each other). So the classifier asks for blue over GREEN as well
 * as blue over red, and the sea — measured at `(10, 49, 57)` in these very frames, a
 * blue-over-green of 8 — is excluded by the first term rather than by a threshold that happens to
 * work on one picture.
 *
 * **AND IT ASKS FOR A DARK PIXEL, WHICH IT DID NOT HAVE TO UNTIL 2026-08-02.** The frozen margin
 * (`buildFrostMargin`) put frost-toned ground over the whole island outside the board, and
 * `WINTER_GROUND_TONES.frost` is `(200, 223, 239)`: a blue-over-green of 16 and a blue-over-red of
 * 39, which is within a pixel's lighting of clearing both of the terms above. It did clear them,
 * and the run before this line went in reported a front starting 42px further left than the panel's
 * own edge — the margin, read as front. The front is `(60, 127, 160)`, so its RED is 140 below
 * frost's while its blue-over-red is 61 above; the front is the one dark value in the cold palette
 * and that constant's own docblock says so. Keying on darkness is therefore keying on the property
 * the tone was chosen for rather than on a threshold that separates these two frames.
 *
 * Reported in CSS pixels of this test's viewport, so it can be set against the crisis panel's own
 * `getBoundingClientRect`.
 */
function frontBand(
  sample: { data: Uint8ClampedArray; width: number; height: number },
  view: { readonly width: number; readonly height: number },
  behind: number,
): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  pixels: number;
  /** How many of those pixels fall left of `behind`, so the panel is hiding them. */
  hidden: number;
} {
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  let pixels = 0;
  let hidden = 0;
  for (let y = 0; y < sample.height; y += 1) {
    for (let x = 0; x < sample.width; x += 1) {
      const at = (y * sample.width + x) * 4;
      const r = sample.data[at] ?? 0;
      const g = sample.data[at + 1] ?? 0;
      const b = sample.data[at + 2] ?? 0;
      if (!(b - g > 15 && b - r > 40 && r < 140)) {
        continue;
      }
      pixels += 1;
      const cssX = (x * view.width) / sample.width;
      const cssY = (y * view.height) / sample.height;
      if (cssX < behind) {
        hidden += 1;
      }
      left = Math.min(left, cssX);
      right = Math.max(right, cssX);
      top = Math.min(top, cssY);
      bottom = Math.max(bottom, cssY);
    }
  }
  return { left, right, top, bottom, pixels, hidden };
}

/**
 * THE PAIR OF CAPTURES ONE MOMENT OWES: the screen, and the canvas under it.
 *
 * The second is what the frost is judged on, and it is not an optimisation — a capture taken
 * with the crisis mount up returns a stale canvas layer, so the composite alone cannot be read
 * for anything the renderer changed.
 */
async function photograph(name: string): Promise<string> {
  await keep(`composite-${name}`, await capture());
  const mount = query<HTMLElement>(".winter-in-city");
  mount.style.visibility = "hidden";
  try {
    const island = await capture();
    await keep(`island-${name}`, island);
    return island;
  } finally {
    mount.style.visibility = "";
  }
}

/** Mount the composition and wait for the SETTLEMENT to be drawn, not merely mounted. */
async function openCrisisOverTheIsland(
  onBoard: (board: WinterCityBoard | null) => void,
): Promise<void> {
  await page.viewport(HIS_WINDOW.width, HIS_WINDOW.height);
  h = mount(<CityUnderWinter onBoard={onBoard} />);
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
  await new Promise<void>((resolve) => setTimeout(resolve, 2500));
  /*
   * A THROWAWAY CAPTURE, and it is load-bearing. `Page.captureScreenshot` with a `clip` puts a
   * device-metrics override on the page, which R3F sees as a resize: it re-measures and
   * re-renders, and the frame the FIRST capture returns is the one drawn before any of that
   * settled. `winterIslandVisible` measured a first clipped capture coming back as flat pale
   * sky. So the first one is spent here.
   */
  await capture();
  await new Promise<void>((resolve) => setTimeout(resolve, 600));
}

/** Answer the round's whole batch through the panel, so the round really resolves. */
async function answerTheBatch(round: number): Promise<void> {
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
    setInputValue(query<HTMLInputElement>(".winter-in-city .hw-panel input"), key);
    await waitFor(
      () => !findButton(panel(), /^Check$/).disabled,
      `Check arms on question ${index + 1} of round ${round}`,
    );
    findButton(panel(), /^Check$/).click();
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-verdict") !== null,
      `a verdict lands on question ${index + 1} of round ${round}`,
    );
    findButton(panel(), /See what you earned|Next question/).click();
    await waitFor(
      () =>
        index + 1 >= keys.length
          ? panel().dataset.phase === "resolved"
          : document.querySelector(".winter-in-city .hw-verdict") === null,
      `the batch moves on from question ${index + 1} of round ${round}`,
    );
  }
}

/**
 * One whole round, played through the panel: reinforce a building, answer the batch, and let
 * the frost advance.
 *
 * **REINFORCE AND NOT A PULL-BACK, WHICH WAS TRIED FIRST AND PHOTOGRAPHED WRONG.** A pull-back
 * hands the frost a whole rim band at once and paints it `abandoned`, which sits ABOVE the
 * frost on the rung ladder — so the first mid-encounter frame taken this way was a picture of
 * a large dead-char region with the frost hidden under it. The subject is the frost's own
 * advance, so the round is played with the one action that changes no ground at all.
 */
async function playRoundThroughThePanel(
  round: number,
  reinforce: (nodeId: string) => void,
): Promise<void> {
  findButton(panel(), /Reinforce a building/).click();
  await waitFor(
    () => panel().dataset.aiming === "true",
    `the panel arms a reinforce in round ${round}`,
  );
  reinforce("NUM.S");
  await waitFor(
    () => !findButton(panel(), /Commit and face/).disabled,
    `the commit control arms in round ${round}`,
  );
  findButton(panel(), /Commit and face/).click();
  await waitFor(
    () => panel().dataset.phase === "answering",
    `the batch opens in round ${round}`,
  );
  await answerTheBatch(round);
  findButton(panel(), /Let the frost advance/).click();
  await waitFor(
    () => panel().dataset.phase === "declaring",
    `round ${round} closes and the next opens`,
  );
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 900));
}

/** Answer the round's whole batch, `correct` of them right, through the panel. */
async function answerTheBatchWith(round: number, correct: number): Promise<void> {
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
      index < correct ? key : wrongButReadable(key),
    );
    await waitFor(
      () => !findButton(panel(), /^Check$/).disabled,
      `Check arms on question ${index + 1} of round ${round}`,
    );
    findButton(panel(), /^Check$/).click();
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-verdict") !== null,
      `a verdict lands on question ${index + 1} of round ${round}`,
    );
    findButton(panel(), /See what you earned|Next question/).click();
    await waitFor(
      () =>
        index + 1 >= keys.length
          ? panel().dataset.phase === "resolved"
          : document.querySelector(".winter-in-city .hw-verdict") === null,
      `the batch moves on from question ${index + 1} of round ${round}`,
    );
  }
}

/** Reinforce a building, answer `correct` of three, and let the frost advance. */
async function playRound(
  round: number,
  reinforce: string,
  correct: number,
  pick: (nodeId: string) => void,
): Promise<void> {
  findButton(panel(), /Reinforce a building/).click();
  await waitFor(
    () => panel().dataset.aiming === "true",
    `the panel arms a reinforce in round ${round}`,
  );
  pick(reinforce);
  await waitFor(
    () => !findButton(panel(), /Commit and face/).disabled,
    `the commit control arms in round ${round}`,
  );
  findButton(panel(), /Commit and face/).click();
  await waitFor(
    () => panel().dataset.phase === "answering",
    `the batch opens in round ${round}`,
  );
  await answerTheBatchWith(round, correct);
  findButton(panel(), /Let the frost advance/).click();
  await new Promise<void>((resolve) => setTimeout(resolve, 1200));
  await document.fonts.ready;
}

/** Every floating label on screen, with what it says. */
function labelsOnScreen(): { nodeId: string; text: string; status: string }[] {
  return [...document.querySelectorAll<HTMLElement>("[data-skill-label]")].map((el) => ({
    nodeId: el.dataset.skillLabel ?? "",
    text: el.textContent ?? "",
    status: el.dataset.labelStatus ?? "",
  }));
}

test.runIf(SHOTS)(
  "photographs the crisis statuses and the freeze notice at 1024x580",
  async () => {
    let latest: WinterCityBoard | null = null;
    await openCrisisOverTheIsland((board) => {
      if (board) {
        latest = board;
      }
    });
    const pick = (nodeId: string): void => {
      (latest as unknown as WinterCityBoard).onPickBuilding(nodeId);
    };

    // ROUND ONE, BEFORE ANYTHING IS LOST: every label is already a status rather than a skill
    // name, which is the half of the ask a later frame cannot show.
    const onLoad = labelsOnScreen();
    expect(onLoad.length, "no floating labels on the crisis board").toBeGreaterThan(3);
    for (const label of onLoad) {
      expect(label.status, `${label.nodeId} still names its skill`).not.toBe("");
    }
    await photograph("01-round-one-statuses-1024x580");

    // ROUND ONE PLAYED PERFECTLY on one building, so it is SHIELDED while the frost closes on
    // the rest — the three-state frame the ask is about.
    await playRound(1, "NUM.S", 3, pick);
    const midway = labelsOnScreen();
    const said = new Set(midway.map((l) => l.status));
    expect([...said], "no shielded building in the frame").toContain("shielded");
    expect([...said], "no threatened building in the frame").toContain("threatened");
    await photograph("02-shielded-and-in-danger-1024x580");

    // ROUND TWO THROWN AWAY, so the frost takes a band of the settlement at once and the notice
    // has to report several.
    await playRound(2, "NUM.S", 0, pick);
    const notice = document.querySelector<HTMLElement>('[data-testid="hw-frozen-notice"]');
    expect(notice, "buildings were lost and nothing announced it").not.toBeNull();
    const lost = labelsOnScreen().filter((l) => l.status === "lost");
    expect(
      lost.length,
      "no building reads FROZEN after a thrown-away round",
    ).toBeGreaterThan(0);
    await photograph("03-frozen-and-the-notice-1024x580");

    // ...and the notice's own text, recorded beside the frames so a reader can check the words
    // against the picture without decoding a PNG.
    if (SHOTS) {
      await commands.writeFile(
        "docs/design-refs/hard-winter-crisis-qa/measured-labels.txt",
        [
          `notice: ${notice?.textContent ?? "(none)"}`,
          `frozen buildings: ${lost.length}`,
          ...labelsOnScreen().map((l) => `${l.nodeId}: ${l.status} — "${l.text}"`),
        ].join("\n"),
        { encoding: "utf-8" },
      );
    }
  },
  300000,
);
