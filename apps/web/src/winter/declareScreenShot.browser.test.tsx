/**
 * THE DECLARE SCREEN AT THE LEAD'S OWN WINDOW SIZE, photographed whole.
 *
 * 1024x580, which is the window the lead reads this from and is deliberately NOT a
 * comfortable developer viewport. This panel's problems are problems about a SHORT window,
 * so a tall screenshot fits everything and cannot show which sentence pushed the commit
 * control under the fold. Two shots were read at 1440x960 earlier the same day and both
 * missed it.
 *
 * The era is set to a LATER one on purpose, because the lead's save is in era two: that is
 * the state the era-mismatch line renders in, so a shot taken in era one would photograph a
 * screen with one fewer paragraph on it than the one being complained about.
 *
 * **The whole screen is shown as TWO 580px frames rather than as one tall image**, and that
 * is the point rather than a limitation of the tooling. A tall shot of this surface fits
 * everything and so cannot show what is under the fold, which is the specific way the two
 * earlier shots misled: the second frame is the same window scrolled, so "how much is left
 * to read after the first screenful" is legible instead of averaged away. `clip` pins the
 * frame to his window exactly, because the page itself is taller than the window and an
 * unclipped shot pads the rest with white.
 *
 * The element shot of `.hw-side` is the declare panel entire, which is the one region worth
 * reading in one piece.
 *
 * Gitignored, like every other `__screenshots__` shot in this tree. Regenerate with
 *
 *   npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/winter/declareScreenShot.browser.test.tsx
 */

import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { afterEach, beforeEach, expect, test } from "vitest";
import { page } from "vitest/browser";
import { resetCityEra, setCityEra } from "../city/useCityEra";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { canPlayCrisisIn } from "./crisisEra";
import { WINTER_NODE_ORDER } from "./hardWinterItems";
import { WinterRoute } from "./WinterRoute";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const allPractised = (): readonly string[] => WINTER_NODE_ORDER;

/** The lead's actual window. Short, which is where this panel's problems live. */
const HIS_WINDOW = { width: 1024, height: 580 };
let h: Harness | null = null;

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

/** One frame of his window, clipped to it, or one element entire. */
async function shoot(name: string, element?: HTMLElement): Promise<void> {
  await document.fonts.ready;
  if (CAPTURE_EVIDENCE) {
    expect(
      await page.screenshot({
        ...(element
          ? { element }
          : { clip: { x: 0, y: 0, width: HIS_WINDOW.width, height: HIS_WINDOW.height } }),
        path: `__screenshots__/declare/${name}.png`,
      } as Parameters<typeof page.screenshot>[0]),
      `no screenshot for ${name}`,
    ).toBeTruthy();
  }
}

/** The era the lead's save is in: a later one, with no authored land of its own (D-ERA25). */
function borrowedBoardEra(): EraId {
  const later = ERA_SEQUENCE.find((era) => !canPlayCrisisIn(era.id));
  if (!later) {
    throw new Error("every era has authored land, so no era-mismatch line can render");
  }
  return later.id;
}

test("photographs the declare screen at 1024x580, in the era the lead is in", async () => {
  await page.viewport(HIS_WINDOW.width, HIS_WINDOW.height);
  setCityEra(borrowedBoardEra());
  h = mount(<WinterRoute readMasteredNodes={allPractised} />);

  /*
   * THE ADVISOR IS THE FIRST THING ON THE ROUTE, so it is photographed before it is
   * dismissed: that card being reachable from `?winter` at all is the fix item 2 asks for,
   * and a screenshot of the board behind it would be a picture of the fix not landing.
   */
  await waitFor(
    () => document.querySelector('[data-testid="crisis-call-advisor"]') !== null,
    "the advisor greets the route",
  );
  await shoot("01-advisor-1024x580");
  query<HTMLButtonElement>('[data-testid="crisis-call-face"]').click();

  await waitFor(() => document.querySelector(".hw-grid") !== null, "the island renders");
  await shoot("02-declare-window-1024x580");

  // THE SECOND SCREENFUL, at the same window. What is left to read after the first one is
  // exactly the thing the text cut is about, and it is what a tall shot averages away.
  const panel = query<HTMLElement>(".hw-side");
  panel.scrollIntoView({ block: "end" });
  await waitFor(() => window.scrollY > 0, "the window scrolls");
  await shoot("03-declare-scrolled-1024x580");
  window.scrollTo(0, 0);

  await shoot("04-declare-panel-entire", query<HTMLElement>(".hw-side"));

  // AND THE WORDS, so the reduction is quotable and not only visible. `textContent` of the
  // three regions the lead named, printed for the record.
  const words = (selector: string): string =>
    (query<HTMLElement>(selector).textContent ?? "").replace(/\s+/g, " ").trim();
  const inventory = {
    header: words(".hw-header"),
    note: words(".hw-note"),
    declare: words(".hw-side .hw-panel"),
    // The settlement read-out is `.hw-strip` now, not `.hw-panel--status`: a status line on one
    // row beside the island's key, under the masthead, on the lead's instruction that the block
    // at the foot of the panel was *"taking up extra space on the bottom and bleeding over"*.
    // The two sweeps below are unchanged and still read every word of it.
    settlement: words(".hw-strip"),
  };
  for (const [region, text] of Object.entries(inventory)) {
    console.log(`[${region}] ${text.length} chars :: ${text}`);
  }

  /*
   * THE ONE THING A SCREENSHOT CANNOT BE TRUSTED FOR, so it is measured: the em-dash. The
   * repository bans it in learner-facing copy and `hard-winter.css` §7 records that the
   * repository's own em-dash sweep has never been able to read a string out of this file,
   * because they are JSX children rather than exported constants. So it is read off the
   * RENDERED text here, where it cannot hide.
   */
  const rendered = Object.values(inventory).join(" ");
  expect(rendered, "an em-dash reached the declare screen").not.toMatch(/[\u2014\u2013]/);
  // And the decision id that used to be cited at the audience.
  expect(rendered, "a decision id is on screen").not.toMatch(/D-[A-Z]+\d*-?\d*/);
});
