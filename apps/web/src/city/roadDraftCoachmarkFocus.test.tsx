import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { materialWord } from "../economy/materialWord";
import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";
import { coachMarkKey, ROADS_HINT_MIN_GOLD } from "./coachmarks/coachMarksCore";
import { DEFAULT_ERA_ID } from "./eraState";
import { ONBOARDING_ADVISOR_DONE_KEY } from "./onboarding/onboardingScript";
import { ONBOARDING_DEMO_SEEN_KEY } from "./onboarding/useDemoScript";

type User = ReturnType<typeof userEvent.setup>;

/**
 * **THE ORDINARY REPRO: Build → Roads → Roads card → dismiss the "roads" coach-mark →
 * ArrowRight, exactly as played, with no manual `.focus()` anywhere in this file.**
 *
 * Two things used to converge to strand a learner's first ArrowRight:
 *
 *  1. `RoadPaintBar` (`CitySurface.tsx`) focuses its own Confirm button on mount, and a
 *     fresh road draft is always empty, so Confirm is always disabled at that instant —
 *     the focus call is a guaranteed no-op. Arrow keys are read by `.city-viewport` alone
 *     (`RoadPaintBar` has no key handling of its own beyond Escape), so whichever element
 *     focus was ACTUALLY left on when road mode opened is where ArrowRight goes instead.
 *     Fixed by `startRoadMode` itself focusing `.city-viewport`, proved directly below.
 *  2. Starting road mode closed the shop (`shopOpen` → false) without opening `placement`,
 *     which was exactly the combination `coachActive` required — so the "roads" hint, which
 *     had been waiting on the Build button, could newly qualify and mount right then, over
 *     the button the learner had just used, and its dismiss (a real click moves focus onto
 *     "Got it" first, then drops it to `<body>` when the tooltip unmounts) would have undone
 *     fix (1) even where it worked. Fixed by adding `!roadDraft` to `coachActive`, alongside
 *     the `!placement` it already carries — proved below by asserting the hint never mounts
 *     at all once a draft is open. `Tooltip`'s own general "restore whatever had focus
 *     before this hint appeared" fix, for every OTHER anchor a hint can still land on mid
 *     interaction, is `coachmarks/Tooltip.test.tsx`'s.
 *
 * Neither half was exercised by the suite's existing road tests: every one of them calls
 * `screen.getByTestId("city-viewport").focus()` before pressing an arrow key, which is the
 * one thing an ordinary learner never does. This file never calls `.focus()` on anything.
 */
function fixedGoldSession() {
  return createCityDevSession();
}

/** Open Build, then the Roads tab, then the Roads card — the road-net wallet is already
 * seeded with enough for the "roads" coach-mark's own gold threshold. */
async function reachRoadPaintBar(user: User): Promise<HTMLElement> {
  await user.click(await screen.findByRole("button", { name: "Build" }));
  const shop = await screen.findByRole("dialog");
  await user.click(within(shop).getByRole("tab", { name: "Roads" }));
  const card = shop.querySelector<HTMLElement>('button[data-node-id="roads"]');
  if (!card) {
    throw new Error("the build menu drew no Roads card");
  }
  await user.click(card);
  return screen.findByTestId("road-paint-bar");
}

/**
 * Seed every earlier coach-mark as already seen so the derived game state's only
 * unseen + relevant hint is "roads" (`gold >= ROADS_HINT_MIN_GOLD && roadTileCount === 0`,
 * both true on a fresh island with the wallet below). `place` (`placedCount === 0`, true
 * here) and `economy` (`gold > 0`, true here) are the only two whose predicates would
 * otherwise also be satisfied and outrank "roads" in `COACH_MARKS`' fixed order.
 */
function seedCoachMarksUpToRoads(): void {
  localStorage.setItem(ONBOARDING_ADVISOR_DONE_KEY, "true");
  localStorage.setItem(ONBOARDING_DEMO_SEEN_KEY, "true");
  localStorage.setItem(coachMarkKey("place"), "true");
  localStorage.setItem(coachMarkKey("economy"), "true");
}

afterEach(() => {
  localStorage.clear();
});

describe("road draft mode does not lose the viewport's arrow-key focus to a coach-mark", () => {
  it("keeps the viewport focused so ArrowRight extends the draft, with no coach-mark in the way", async () => {
    const user = userEvent.setup();
    seedCoachMarksUpToRoads();
    const session = fixedGoldSession();
    render(
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo
        goldAvailable={ROADS_HINT_MIN_GOLD}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
      />,
    );

    const bar = await reachRoadPaintBar(user);
    // Starting road mode no longer qualifies the "roads" hint to open ON TOP of the draft
    // (see `coachActive`'s `!roadDraft`) — proved here rather than merely asserted, so a
    // regression that widens `coachActive` again is caught even without the dismiss step.
    expect(screen.queryByTestId("coach-mark-roads")).toBeNull();

    expect(within(bar).getByTestId("road-cost")).toHaveTextContent(
      `0 ${materialWord(DEFAULT_ERA_ID)}`,
    );

    // No manual focus call anywhere above or below this line.
    await user.keyboard("{ArrowRight}");

    // Any non-zero cost is the tell: the seed cell plus its neighbour, or just the
    // neighbour if the seed itself is already spoken for, is what a single ArrowRight
    // draws on a fresh island (`extendRoad`'s own first-press special case) — the exact
    // count is `extendRoad`'s contract, not this repro's. What this proves is that the key
    // reached `.city-viewport` at all, which is the defect: before the fix this stayed
    // `0 ${materialWord}` because focus was never there to receive it.
    expect(within(bar).getByTestId("road-cost")).not.toHaveTextContent(
      `0 ${materialWord(DEFAULT_ERA_ID)}`,
    );
  });

  it("focuses the viewport the instant road mode opens, before any coach-mark can render", async () => {
    // The same walk, asserted on the DOM directly rather than through its keyboard
    // consequence: `startRoadMode` moves focus synchronously with the state change that
    // opens the draft, so by the time anything else (a coach-mark, a re-render) could run,
    // `.city-viewport` already has it.
    const user = userEvent.setup();
    seedCoachMarksUpToRoads();
    const session = fixedGoldSession();
    render(
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo
        goldAvailable={ROADS_HINT_MIN_GOLD}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
      />,
    );

    await reachRoadPaintBar(user);
    expect(document.activeElement).toBe(screen.getByTestId("city-viewport"));
  });
});
