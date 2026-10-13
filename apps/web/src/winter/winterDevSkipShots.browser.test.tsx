import { HARD_WINTER } from "@cr/game";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";
import { resetCityEra } from "../city/useCityEra";
import { findButton, type Harness, mount, waitFor } from "../lessons/testHarness";
import { WINTER_NODE_ORDER } from "./hardWinterItems";
import { WinterRoute } from "./WinterRoute";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * **THE DEV SKIP, PHOTOGRAPHED AT THE LEAD'S OWN WINDOW, AND THE STATES IT REACHES.**
 *
 * 1024x580 — his actual window, and deliberately not a comfortable developer viewport. A short
 * screen has hidden a real defect on this surface twice, and it is also the viewport where a fixed
 * corner panel costs the most, so it is the only honest place to judge what this control covers.
 *
 * ## WHAT THE FRAMES ARE FOR, WHICH IS NOT WHAT THE ASSERTIONS ARE FOR
 *
 * The assertions establish that each frame is over a REAL state: that the frost has actually
 * advanced, that a building is actually damaged, that the outcome screen is actually up. A
 * screenshot cannot say that — it is exactly as convincing over a board that never moved. What the
 * frames add is the one thing no measurement here can give: whether a reviewer can still see the
 * board with this panel in the corner. That claim is spatial, so it owes a picture somebody looked
 * at, and the frames are clipped to the WHOLE WINDOW rather than to the panel for the same reason.
 * A crop of the control is a picture of the one thing nobody doubted.
 *
 * ## THE `?winter` ROUTE, NOT THE IN-CITY MOUNT
 *
 * Because the 2D grid states the things being claimed in text as well as in colour: a frozen cell,
 * a ruin's mark, and the damage stage as a digit on the building. In-city those are three.js ground
 * tones over a live canvas, which is a heavier scene and a weaker read.
 * `winterDevSkipOverTheIsland.browser.test.tsx` is the other half and takes the in-city frame.
 *
 * Gitignored, like every other `__screenshots__` shot in this tree. Regenerate with
 *
 *   npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/winter/winterDevSkipShots.browser.test.tsx
 */

/** The lead's actual window. Short, which is where a corner panel costs the most. */
const HIS_WINDOW = { width: 1024, height: 580 } as const;

const allPractised = (): readonly string[] => WINTER_NODE_ORDER;

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

beforeEach(() => {
  localStorage.clear();
  resetCityEra();
});

afterEach(() => {
  h?.cleanup();
  h = null;
  resetCityEra();
  localStorage.clear();
});

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

/**
 * WHERE THIS TEST'S VIEWPORT SITS INSIDE THE REAL BROWSER WINDOW.
 *
 * Vitest runs the test in an iframe on a tester page and SCALES that iframe when the requested
 * viewport does not match the window, so a clip written in CSS pixels of the requested viewport
 * lands in the wrong place on the real screen. Measured here rather than assumed: the first version
 * of this file asked `page.screenshot` for `{x: 0, y: 0, width: 1024, height: 580}` and got back a
 * 647x1024 image with the page in its top third and white below — a frame nobody could judge a
 * layout from. `winterIslandVisible.browser.test.tsx` documents the same defect and this is its fix.
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
 * One frame of his window, captured over CDP and clipped to where that window really is.
 *
 * `Page.captureScreenshot` rather than `page.screenshot`, on the precedent above: the latter is
 * Playwright's locator capture and writes in the tester page's coordinates.
 *
 * The frame is written at the viewport's own scale, and the SCALE IS ASSERTED — a frame silently
 * captured at 0.63 is the specific way this evidence went wrong once, and a shrunken frame is not
 * evidence about legibility on a 1024x580 screen.
 */
async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a 1024x580 screen`,
  ).toBeCloseTo(1, 1);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, HIS_WINDOW.width),
      height: Math.min(box.height, HIS_WINDOW.height),
      scale: 1,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `apps/web/src/winter/__screenshots__/dev-skip/${name}.png`,
      shot.data,
      { encoding: "base64" },
    );
  }
}

const shell = (): HTMLElement => query<HTMLElement>(".hw-shell");

/** Light a fire on the island's heart and commit, which is one round's declaration. */
async function declareAFireAndCommit(): Promise<void> {
  findButton(shell(), /Light a fire/).click();
  await waitFor(
    () => document.querySelector<HTMLButtonElement>('[data-cell="0,0"]') !== null,
    "the board offers the centre cell",
  );
  query<HTMLButtonElement>('[data-cell="0,0"]').click();
  await waitFor(() => !findButton(shell(), /Commit and face/).disabled, "commit arms");
  findButton(shell(), /Commit and face/).click();
  await waitFor(
    () => document.querySelector(".hw-skip__rung:not([disabled])") !== null,
    "the skip's per-round row comes alive in the answering phase",
  );
}

/*
 * SCOPED TO `.hw-grid`, and that is a correction rather than tidiness: `WinterLegend` draws its
 * key with the SAME cell classes on swatches, so an unscoped count read one frozen cell and one
 * ruin on a board where nothing had happened yet. The floor assertion below caught it.
 */

/** How many island cells the frost holds, read off the board rather than the state. */
const frozenCells = (): number =>
  document.querySelectorAll(".hw-grid .hw-cell--frozen").length;

/** Buildings the frost has marked: a digit on the tile, or a ruin's cross. */
const harmedBuildings = (): number =>
  document.querySelectorAll(".hw-grid .hw-cell__hurt, .hw-grid .hw-cell--ruin").length;

test("photographs the control, a mid-encounter board reached through it, and the ending", async () => {
  await page.viewport(HIS_WINDOW.width, HIS_WINDOW.height);
  h = mount(<WinterRoute readMasteredNodes={allPractised} />);

  // The route opens on the briefing; the encounter is behind it.
  await waitFor(
    () => document.querySelector('[data-testid="crisis-call-face"]') !== null,
    "the advisor greets the route",
  );
  query<HTMLButtonElement>('[data-testid="crisis-call-face"]').click();
  await waitFor(() => document.querySelector(".hw-grid") !== null, "the board renders");

  /* ------------------------------------------------------- 1. the control, before anything */

  const skip = query<HTMLElement>(".hw-skip");
  expect(skip, "the dev skip control is not on the surface").not.toBeNull();
  // Both rows are on screen, and the ladder reads in the tuning table's own vocabulary. Measured
  // rather than photographed, because a screenshot cannot be searched for a word.
  const words = (skip.textContent ?? "").replace(/\s+/g, " ");
  for (const rung of ["none", "weak", "steady", "strong"]) {
    expect(words, `the ladder does not name the ${rung} tier`).toContain(rung);
  }
  // On the declare screen every rung is inert, and the control SAYS SO rather than leaving four
  // dim buttons to be guessed at. The live wording is asserted at the answering frame below.
  expect(words).toContain("Commit an action to resolve round 1");
  expect(
    Array.from(document.querySelectorAll<HTMLButtonElement>(".hw-skip__rung")).every(
      (rung) => rung.disabled,
    ),
    "a rung is pressable before an action has been committed",
  ).toBe(true);
  await shoot("01-control-on-the-declare-screen-1024x580");

  /*
   * WHAT IT COSTS THE SCREEN, in numbers beside the picture. The frames are the evidence about
   * whether the board is still readable; these are the two facts a picture is bad at.
   */
  const box = skip.getBoundingClientRect();
  expect(box.width * box.height, "the panel is not rendered").toBeGreaterThan(0);
  const share = (box.width * box.height) / (HIS_WINDOW.width * HIS_WINDOW.height);
  expect(
    share,
    `the panel covers ${Math.round(share * 100)}% of a 1024x580 window`,
  ).toBeLessThan(0.12);
  // And it is clear of the board entirely on this route, which is what having its own column buys.
  const board = query<HTMLElement>(".hw-grid").getBoundingClientRect();
  expect(
    box.left > board.right || box.right < board.left || box.top > board.bottom,
    `the panel overlaps the board (panel ${Math.round(box.left)}..${Math.round(box.right)}, board ${Math.round(board.left)}..${Math.round(board.right)})`,
  ).toBe(true);

  /* ------------------------------------- 2. the answering screen, with the ladder live */

  await declareAFireAndCommit();
  expect(
    document.querySelector(".hw-question"),
    "no question is being asked",
  ).not.toBeNull();
  // The row is live now, and the legend has switched to the wording that names a press.
  expect((query<HTMLElement>(".hw-skip").textContent ?? "").replace(/\s+/g, " ")).toContain(
    "Resolve round 1 as",
  );
  expect(
    query<HTMLButtonElement>('[data-testid="hw-dev-skip-resolve-steady"]').disabled,
  ).toBe(false);
  await shoot("02-answering-with-the-ladder-live-1024x580");

  /* ---------------------------------- 3. mid-encounter: frost advanced, damage standing */

  // Three rounds at the WEAK rung, which is one warm cell: enough of a fire to be visible in the
  // log and nowhere near enough to save the shore. That is what puts damage on the board.
  expect(frozenCells(), "the frost has already moved before a round was played").toBe(0);
  /*
   * **EVERY ROUND BUT THE LAST, DERIVED FROM THE ROUND COUNT.** It played three, which was every
   * round but the last two at `HARD_WINTER.rounds: 5`; at three rounds a third round CLOSES the
   * winter, so the loop's own *"round N + 1 opens"* wait had no round to wait for and the frame
   * would have been taken over a conclusion card instead of a mid-encounter board.
   *
   * The frame this photographs is a board with frost and damage on it and a round still to play, so
   * the count is `rounds - 1` rather than a number: a round count that moves again moves this with
   * it instead of timing out.
   */
  for (let round = 1; round <= HARD_WINTER.rounds - 1; round += 1) {
    if (round > 1) {
      await declareAFireAndCommit();
    }
    query<HTMLButtonElement>('[data-testid="hw-dev-skip-resolve-weak"]').click();
    await waitFor(
      () => document.querySelector(".hw-magnitude") !== null,
      `round ${round} resolves at the weak rung`,
    );
    findButton(shell(), /Let the frost advance/).click();
    await waitFor(
      () => document.querySelector(".hw-actions") !== null,
      `round ${round + 1} opens`,
    );
  }

  /*
   * THE STATE THE FRAME IS OF, established before the frame is taken. Without these three the
   * screenshot below is a picture of the declare screen with a different round number on it.
   */
  expect(frozenCells(), "no ground froze, so the frost never advanced").toBeGreaterThan(0);
  expect(
    harmedBuildings(),
    "no building is damaged or ruined, so there is no damage standing to photograph",
  ).toBeGreaterThan(0);
  // The round the loop above left open, derived rather than pinned: it played every round but the
  // last, so the board is on the last one. It read "Round 4" back when the winter ran five rounds.
  expect(query<HTMLElement>(".hw-round").textContent ?? "").toContain(
    `Round ${HARD_WINTER.rounds}`,
  );
  // Every round the loop played is in the log, each at the rung that was asked for, so the board
  // was reached THROUGH the control rather than beside it. Derived from the same round count the
  // loop is: it read a flat 3 while the loop happened to play three of five rounds.
  const log = document.querySelectorAll(".hw-log li");
  expect(log).toHaveLength(HARD_WINTER.rounds - 1);
  for (const entry of Array.from(log)) {
    expect(entry.textContent ?? "").toContain("1 of 3 right");
  }
  await shoot("03-frost-advanced-and-damage-standing-1024x580");

  /*
   * 3b. THE SAME BOARD WITH THE PANEL FOLDED, which is the answer to what it covers.
   *
   * The frames above show it over the top-right corner, and on this route that corner holds the
   * round counter — which the panel itself names, so nothing is lost. It is still a corner
   * somebody photographing the island may want back, so the fold is a real control and this is
   * the frame that shows what pressing it returns. The measurement beside it is the point: the
   * folded chip is a fraction of the open panel.
   */
  const openArea = skip.getBoundingClientRect().width * skip.getBoundingClientRect().height;
  query<HTMLButtonElement>('[data-testid="hw-dev-skip-fold"]').click();
  await waitFor(
    () => document.querySelector(".hw-skip__row") === null,
    "the panel folds to a chip",
  );
  const foldedBox = query<HTMLElement>(".hw-skip").getBoundingClientRect();
  const foldedArea = foldedBox.width * foldedBox.height;
  expect(
    foldedArea / openArea,
    `folded it still covers ${Math.round((foldedArea / openArea) * 100)}% of the open panel`,
  ).toBeLessThan(0.3);
  await shoot("03b-the-same-board-with-the-panel-folded-1024x580");
  query<HTMLButtonElement>('[data-testid="hw-dev-skip-fold"]').click();
  await waitFor(
    () => document.querySelector(".hw-skip__row") !== null,
    "the panel opens again",
  );

  /* ------------------------------------------------------------------ 4. the ending, in one press */

  query<HTMLButtonElement>('[data-testid="hw-dev-skip-runout-weak"]').click();
  await waitFor(
    () => document.querySelector('[data-testid="hw-conclusion"]') !== null,
    "the run-out reaches the outcome screen",
  );
  // The whole winter really played out: one log row per round, and the engine computed an
  // outcome. Read off the tuning rather than the 5 it said, which went stale on 2026-08-01.
  expect(document.querySelectorAll(".hw-log li")).toHaveLength(HARD_WINTER.rounds);
  await shoot("04-outcome-screen-reached-by-run-out-1024x580");

  // AND THE CONTROL IS GONE at the ending, so it cannot half-cover the card a reviewer came for.
  expect(
    document.querySelector(".hw-skip"),
    "the dev panel is still drawn over the concluding screen",
  ).toBeNull();
});
