import {
  createHardWinter,
  hardWinterIsland,
  winterFrostAfterAdvance,
  winterSpreadSteps,
} from "@cr/game";
import { type ReactElement, useRef, useState } from "react";
import { afterAll, beforeAll, expect, test } from "vitest";
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

import "../../styles.css";

/**
 * **ONE RING OF ICE, PHOTOGRAPHED AT EVERY ROUND OF A PLAYED WINTER.**
 *
 * The lead, for at least the fifth time: *"the double ice ring in the winter crisis is still
 * there. it should always just be one ring bro like for the 50th time there shouldnt be two
 * concentric rings once the frost moves"*.
 *
 * ## WHY THIS IS A THREE-ROUND SEQUENCE AND NOT ONE FRAME
 *
 * *"Once the frost moves"* is the whole of the report. Round one takes one step and has always
 * drawn one ring, so a frame of it proves nothing about the defect — every previous fix in this
 * area was judged on a round-one frame and on a mid-encounter frame that was never counted. The
 * band was as wide as the round's advance and era one's schedule is 1 / 2 / 3, so the picture
 * gets worse with each round and **round three is where two rings were most obvious**.
 *
 * So the sequence is played through the panel, round by round, and photographed at each: the
 * progression is the evidence, and a second ring at any of the three is visible rather than
 * argued. `frostFrontOneRing.test.ts` is the always-on half, which counts the rings off the
 * built geometry on the same three boards.
 *
 * ## THE FRAMES ARE COMMITTED, AT 1024x580, UNDER REDUCED MOTION
 *
 * `.cursor/rules/qa-verification.mdc`: a spatial claim owes a rendered frame somebody looked at,
 * taken at a short realistic viewport and named beside it. 1024x580 is the lead's own window.
 * Nothing is cropped to the front, because the claim is about how the island reads as a whole
 * and a crop of the ring is a picture of the one part nobody doubted.
 *
 * `docs/design-refs/hard-winter-one-ice-ring/` holds the before and after sets and its README is
 * the index. **They are behind `VITE_WINTER_SHOTS`**, per the rule that no test writes a tracked
 * path unless a shot flag is set (`test/testWritesStayOutOfTheTree.test.ts`), and for the reason
 * `winterCrisisShots.browser.test.tsx` records: two shadow-mapped scenes with seven GLBs each,
 * left on in CI, starve an animation-timing assertion in some other file.
 *
 * ## THE ISLAND CAPTURE IS THE ONE THE RING IS JUDGED ON
 *
 * A WebGL canvas composites on its own layer, and a CDP capture taken with a full-screen overlay
 * above it comes back with a STALE canvas frame — `winterIslandVisible.browser.test.tsx`
 * measured that. So each round keeps a `composite-*` of the screen as a player has it and an
 * `island-*` of the same instant with the crisis mount hidden, and the ring is read off the
 * second.
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's actual window, named in every filename per the spatial-claim rule. */
const VIEW = { width: 1024, height: 580 } as const;

/** Both destinations: the frames are evidence in the repository and in the run's output. */
const DIRS = [
  "docs/design-refs/hard-winter-one-ice-ring",
  "output/design-refs/hard-winter-one-ice-ring",
] as const;

const LAYOUT = eraCityLayout(CURRENT_ERA_ID);

function placed(nodeId: string, col: number, row: number): PlacedTransform {
  return { nodeId, col, row, rot: 0 };
}

/**
 * Era one's six skills plus the hall, SPREAD rather than packed.
 *
 * The same city `frostFront.browser.test.tsx` photographs, deliberately: the front is a ring, so
 * a settlement bunched at the centre leaves it out in empty snow where nothing says whether it
 * reads against the buildings — and using the established fixture makes these frames comparable
 * with the ones already in `docs/design-refs/frost-front-one-ring-out/`.
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

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

function session(): {
  send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
} {
  return cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
}

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await session().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
});

afterAll(async () => {
  // CDP emulation is set on the PAGE and vitest's browser worker reuses one page across every
  // file it runs, so leaving this on would switch reduced motion into whatever runs next in the
  // same worker. `intrusionCrisisShots.browser.test.tsx` records the two files that failed the
  // first time somebody left it set.
  await session().send("Emulation.setEmulatedMedia", { features: [] });
  h?.cleanup();
  h = null;
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

/** The city and the crisis, wired the way `CitySurface` wires them. */
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

/** Where this test's viewport sits inside the browser window, so a capture can be clipped to it. */
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
 * Not `page.screenshot`, which is Playwright's locator capture and never gets past *"waiting for
 * element to be stable"* over a canvas running `frameloop="always"`.
 */
async function capture(): Promise<string> {
  const box = testViewportBox();
  const shot = await session().send("Page.captureScreenshot", {
    format: "png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
  });
  if (!shot.data) {
    throw new Error("CDP returned no screenshot data");
  }
  return shot.data;
}

async function keep(name: string, shot: string): Promise<void> {
  for (const dir of DIRS) {
    if (SHOTS) {
      await commands.writeFile(`${dir}/${name}.png`, shot, { encoding: "base64" });
    }
  }
}

/**
 * A capture of the frame as it stands NOW, not as it stood one composite ago.
 *
 * Every clipped `Page.captureScreenshot` puts a device-metrics override on the page, which R3F
 * reads as a resize and re-renders from — so a capture taken right after the DOM changed comes
 * back as the frame drawn before the change. The first round's island frame was photographed
 * this way before the throwaway went in and came back **with the declare card still over the
 * island**, 65,188 pixels different from the same round's other capture while rounds two and
 * three differed by 7,506 and 3,521. So the first one is spent, every time.
 */
async function settledCapture(): Promise<string> {
  await capture();
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
  return capture();
}

/** The screen, and the canvas under it. The ring is judged on the second. */
async function photograph(name: string): Promise<string> {
  await keep(`composite-${name}-${VIEW.width}x${VIEW.height}`, await settledCapture());
  const overlay = query<HTMLElement>(".winter-in-city");
  overlay.style.visibility = "hidden";
  try {
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    const island = await settledCapture();
    await keep(`island-${name}-${VIEW.width}x${VIEW.height}`, island);
    return island;
  } finally {
    overlay.style.visibility = "";
  }
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
 * One whole round, played through the panel, with the one action that changes no ground.
 *
 * REINFORCE rather than a fire, and the reason is the subject: a fire dents the front and holds
 * ground in the island's one warm tone, so a frame taken over one is a picture of the fire. The
 * ring's own width is what these frames are of.
 */
async function playRound(round: number, board: () => WinterCityBoard): Promise<void> {
  findButton(panel(), /Reinforce a building/).click();
  await waitFor(
    () => panel().dataset.aiming === "true",
    `the panel arms a reinforce in round ${round}`,
  );
  board().onPickBuilding("NUM.S");
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
  await new Promise<void>((resolve) => setTimeout(resolve, 1200));
}

/* -------------------------------------------------------------------------- */
/* The always-on premise                                                      */
/* -------------------------------------------------------------------------- */

/**
 * **THE FRAMES ARE ONLY WORTH READING IF THE ROUNDS THEY SHOW ARE THE MULTI-STEP ONES.**
 *
 * The defect is a band as wide as the round's advance, so a schedule that took one step every
 * round would make all three frames pictures of the harmless case. Asserted here, unconditionally,
 * beside the photographs that depend on it.
 */
test("the three rounds photographed below take 1, 2 and 3 steps", () => {
  const island = hardWinterIsland(CURRENT_ERA_ID);
  const opening = createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: CITY.map((p) => ({ node_id: p.nodeId, col: p.col, row: p.row })),
  });
  expect(opening.frozen, "something is frozen on load").toEqual([]);
  expect([1, 2, 3].map(winterSpreadSteps)).toEqual([1, 2, 3]);

  // ...and the frost really does move between the frames, which is the other half of *"once the
  // frost moves"*: three boards that were the same picture would prove nothing either.
  let frozen = new Set<string>();
  const reach: number[] = [];
  for (let round = 1; round <= 3; round += 1) {
    reach.push(frozen.size);
    frozen = winterFrostAfterAdvance(island, frozen, new Set(), winterSpreadSteps(round));
  }
  expect(reach, "the board the frames are taken on does not change between rounds").toEqual(
    [0, 28, 72],
  );
});

/* -------------------------------------------------------------------------- */
/* The photographs                                                            */
/* -------------------------------------------------------------------------- */

test.runIf(SHOTS)(
  `photographs rounds one, two and three at ${VIEW.width}x${VIEW.height}`,
  async () => {
    await page.viewport(VIEW.width, VIEW.height);
    let latest: WinterCityBoard | null = null;
    h = mount(
      <CityUnderWinter
        onBoard={(board) => {
          if (board) {
            latest = board;
          }
        }}
      />,
    );
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
    await new Promise<void>((resolve) => setTimeout(resolve, 3000));
    /*
     * A THROWAWAY CAPTURE, and it is load-bearing. `Page.captureScreenshot` with a `clip` puts a
     * device-metrics override on the page, which R3F sees as a resize and re-renders from — so
     * the first clipped capture after a mount comes back as the frame drawn before any of that
     * settled. `winterIslandVisible.browser.test.tsx` measured it coming back as flat pale sky.
     */
    await capture();
    await new Promise<void>((resolve) => setTimeout(resolve, 800));

    const board = (): WinterCityBoard => {
      if (!latest) {
        throw new Error("the winter never published a board");
      }
      return latest;
    };

    /*
     * Each frame's board is asserted BEFORE it is photographed, so a frame cannot be a picture of
     * some other moment: the round on the panel, and how much ground the frost holds and takes.
     */
    const frames: [string, string][] = [];
    const expected = [
      { round: 1, frozen: 0, takes: 28 },
      { round: 2, frozen: 28, takes: 44 },
      { round: 3, frozen: 72, takes: 16 },
    ];
    for (const { round, frozen, takes } of expected) {
      expect(panel().dataset.phase, `round ${round} is not on declare`).toBe("declaring");
      expect(
        countCells(board(), (cell) => cell.frozen),
        `round ${round} does not hold ${frozen} cells`,
      ).toBe(frozen);
      expect(
        countCells(board(), (cell) => cell.frost_next),
        `round ${round} does not take ${takes} cells`,
      ).toBe(takes);
      frames.push([`round-${round}`, await photograph(`0${round}-round-${round}-of-3`)]);
      if (round < 3) {
        await playRound(round, board);
      }
    }

    /*
     * AND NO TWO OF THE THREE ARE THE SAME FRAME. Byte-identical captures are how a stale canvas
     * layer passes for a second witness, and this instrument has produced that before — three
     * frames that are supposed to show three rounds and are pairwise equal are one piece of
     * evidence wearing three filenames.
     */
    for (const [a, aShot] of frames) {
      for (const [b, bShot] of frames) {
        if (a < b) {
          expect(aShot === bShot, `${a} is byte-identical to ${b}`).toBe(false);
        }
      }
    }
  },
  240000,
);
