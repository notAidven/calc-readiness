import { cityRosterNodeIds } from "@cr/game";
import { DIAGNOSTIC_WALK_SCOPE } from "@cr/item-bank";
import type { PlacementEstimate } from "@cr/state-schema";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import type { PlacementSeed } from "../diagnostic/placementRosters";
import { skillDisplayName } from "../diagnostic/skillNames";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { buildingName } from "./buildingAssets";
import { CURRENT_ERA_ID } from "./eraDressing";
import { type RewardBuilding, UnlockCelebration } from "./UnlockCelebration";

import "../styles.css";

/**
 * **THE FRAMES FOR THE HEADLINE'S TWO NUMBERS, AT A SHORT REAL VIEWPORT.**
 *
 * The claim is not spatial, so a frame is not strictly what
 * `celebrationDenominator.test.tsx` owes — that file drives the whole hand-off and asserts
 * the strings. What a frame adds here is the thing no assertion can: that the two sentences
 * READ correctly beside each other, now that they deliberately count two different sets.
 * "You tested out of 4 of 20 skills!" over a grid of six cards is exactly the sort of screen
 * that measures right and reads as a contradiction, and the only way to know is to look.
 *
 * 1024x580 with reduced motion held, and the popup's body is scroll-clipped at that height,
 * so what is BELOW the fold is part of what these frames show. The island backdrop and the
 * live building thumbnails are off (`enableThumbnails={false}`): headless Chromium has no
 * reliable WebGL, so the cards fall back to the building glyph and the scene to its static
 * gradient — the copy, the numbers and the card layout are what these frames are evidence
 * about, not the 3D.
 *
 * ## MOUNTED INSIDE `.city-shell`, AND THAT IS LOAD-BEARING
 *
 * The first pair of frames taken for this change was mounted bare, and the skip cards' second
 * line ("Assembly Hall") came out almost invisible — which reads exactly like a contrast
 * defect and is not one. `--glass-fill-strong` is declared on `.city-shell` and not on
 * `:root` (`styles.css`), so mounted bare the skip card's `background` is invalid at
 * computed-value time and the card is genuinely transparent onto the scene behind it:
 * measured `rgba(0, 0, 0, 0)` against the learn card's opaque `rgb(240, 233, 219)`.
 * The cut Timeline's browser suite had already written this trap down for the same tokens,
 * and `achievementShots.browser.test.tsx` carries it now.
 *
 * So {@link open} wraps the popup the way `App.tsx` does and ASSERTS the tokens resolve,
 * because a frame taken without them is a frame of a screen that does not ship.
 *
 * ## THE WRITE IS BEHIND `VITE_DIAGNOSTIC_SHOTS`, THE ASSERTIONS ARE NOT
 *
 * `docs/design-refs/` is tracked, and #495 rules that no test writes a tracked path unless a
 * shot flag says so — otherwise a plain `npm run check` leaves committed files modified and
 * overwrites another lane's frames in place. The frames stay committed, because they are what a
 * reviewer opens; only the writing of them moves behind the flag.
 *
 * Everything this file MEASURES runs on every run, and that is the important half: the
 * `.city-shell` token check and the opaque-surface check are the harness fix, not the frames,
 * and they are worth more than the pictures they were found taking. Gating them would put the
 * defect they caught back in reach on any run that is not a capture run.
 */

const SHORT_LAPTOP = { width: 1024, height: 580 };

/** Capture run, per #495. A tracked path is written only when this says so. */
const SHOTS = Boolean(import.meta.env.VITE_DIAGNOSTIC_SHOTS);

const ISLAND_ROSTER = cityRosterNodeIds(CURRENT_ERA_ID);

let harness: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(SHORT_LAPTOP.width, SHORT_LAPTOP.height);
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

function card(nodeId: string): RewardBuilding {
  return {
    nodeId,
    topic: skillDisplayName(nodeId),
    building: buildingName(nodeId),
  };
}

/** A placement over the live instrument's whole scope, with `passing` at a robust pass. */
function placement(passing: readonly string[]): PlacementSeed {
  const seed: Record<string, PlacementEstimate> = {};
  for (const nodeId of DIAGNOSTIC_WALK_SCOPE) {
    seed[nodeId] = passing.includes(nodeId) ? 3 : 0;
  }
  return seed;
}

/** Mount the reward popup the way `App.tsx` does — inside `.city-shell` (see the header). */
async function open(passing: readonly string[]): Promise<HTMLElement> {
  harness = mount(
    <div className="city-shell">
      <UnlockCelebration
        placement={placement(passing)}
        skips={ISLAND_ROSTER.filter((nodeId) => passing.includes(nodeId)).map(card)}
        learns={ISLAND_ROSTER.filter((nodeId) => !passing.includes(nodeId)).map(card)}
        enableThumbnails={false}
        reducedMotion={true}
        onPlace={() => {}}
        onClose={() => {}}
      />
    </div>,
  );
  await waitFor(
    () => document.querySelector(".unlock-reward") !== null,
    "the reward popup",
  );
  await document.fonts.ready;
  const popup = document.querySelector(".unlock-reward") as HTMLElement;

  // The wrapper, asserted rather than assumed. An unresolved custom property does not fall
  // back to anything — it makes the declaration invalid, so the card loses its surface
  // silently and the frame photographs a screen nobody ships.
  const style = getComputedStyle(popup);
  for (const token of ["--glass-fill-strong", "--game-panel-2", "--game-slate-2"]) {
    expect(
      style.getPropertyValue(token).trim(),
      `${token} does not resolve here, so this popup is not being styled as it ships`,
    ).not.toBe("");
  }
  const skip = popup.querySelector<HTMLElement>('.reward-card[data-variant="skip"]');
  const learn = popup.querySelector<HTMLElement>('.reward-card[data-variant="learn"]');
  for (const [label, el] of [
    ["skip", skip],
    ["learn", learn],
  ] as const) {
    if (!el) {
      continue;
    }
    expect(
      getComputedStyle(el).backgroundColor,
      `the ${label} card has no opaque surface, so its second line is drawn onto the island behind it`,
    ).not.toBe("rgba(0, 0, 0, 0)");
  }
  return popup;
}

async function shoot(name: string): Promise<void> {
  // The gate names the flag POSITIVELY and wraps the write, which is the shape #495's guard
  // reads: an early `if (!SHOTS) return` is a gate held the wrong way round and is
  // indistinguishable from a regex that only looks for the name.
  if (SHOTS) {
    if (SHOTS) {
      expect(
        await page.screenshot({
          path: `../../../../docs/design-refs/celebration-denominator/${name}.png`,
        }),
        `no frame for ${name}`,
      ).toBeTruthy();
    }
  }
}

test("the headline counts the whole administration while the grids stay this island's", async () => {
  // The exact case the brief quotes and #492 measured: four passes, two of them outside era
  // one, over the twenty the instrument administers.
  const popup = await open(["NUM.S", "NUM.F", "EXP.1", "RAD.2"]);
  await shoot("headline-counts-the-administration-1024x580");

  // The frame is only evidence if it is a frame of the right screen, so the two sentences
  // are read back off the DOM that was photographed.
  expect(popup.querySelector("h2")?.textContent).toBe(
    `You tested out of 4 of ${DIAGNOSTIC_WALK_SCOPE.length} skills!`,
  );
  expect(popup.querySelector(".unlock-reward-subline")?.textContent).toContain(
    "buildings free on this island",
  );
  expect(popup.querySelectorAll(".reward-card").length).toBe(ISLAND_ROSTER.length);
});

test("the headline still credits three when the learner tested out of nothing on this island", async () => {
  // Three passes, none of them era one's: the skip grid is empty and the headline still owes
  // the learner the credit. The frame is here because "0 buildings free on this island" under
  // "You tested out of 3 of 20 skills!" is the hardest pairing on this screen to read.
  const offIsland = DIAGNOSTIC_WALK_SCOPE.filter(
    (nodeId) => !ISLAND_ROSTER.includes(nodeId),
  ).slice(0, 3);
  const popup = await open(offIsland);
  await shoot("headline-counts-an-off-island-pass-1024x580");

  expect(popup.querySelector("h2")?.textContent).toBe(
    `You tested out of 3 of ${DIAGNOSTIC_WALK_SCOPE.length} skills!`,
  );
  expect(popup.querySelectorAll('.reward-card[data-variant="skip"]').length).toBe(0);
});
