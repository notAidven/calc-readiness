import { HARD_WINTER } from "@cr/game";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import { DEV_SESSION_SCHEMA_VERSION, devSessionStore } from "../devPersistence/devSession";
import { wrongButReadable } from "../test/wrongButReadable";
import { HardWinterSurface } from "./HardWinterSurface";
import { WINTER_NODE_ORDER, winterBatchFor, winterFrozenItem } from "./hardWinterItems";

/**
 * A learner who has practised every era-one skill, stated rather than assumed.
 *
 * The surface reads the learner's REAL practised set now, so a bare mount would draw from an
 * empty store and refuse the batch. These tests are about the mechanic and not about
 * progress, so each one says which learner it is playing as; the progress rule itself is
 * `crisisQuestionPool.test.ts`'s claim.
 */
const allPractised = (): readonly string[] => WINTER_NODE_ORDER;

/**
 * **PLAYING A WINTER OVER SOMEBODY'S CITY MUST NOT TOUCH THEIR CITY UNLESS THEY ASK.**
 *
 * This is the constraint the whole live-board feature turns on, and it is not the kind of
 * claim a docblock can make. Whoever opens this is EVALUATING a tuning number, and a crisis
 * that ruined ground they actually wanted would be the wrong thing to hand them — so the
 * saved blob is read before and after a whole winter is played to the end, and compared
 * byte for byte.
 *
 * BYTE-FOR-BYTE OVER THE RAW STRING, rather than field by field over a parsed object: a
 * parsed comparison would pass a rewrite that reordered keys or dropped one the parser
 * happens to tolerate, and "we saved something equivalent" is not the promise. The promise
 * is that nothing was written at all.
 *
 * ## WHAT CHANGED ON 2026-07-30, and why it is a narrowing rather than a weakening
 *
 * This file used to argue that the winter is a sandbox BY CONSTRUCTION: *"the engine is a
 * pure reducer with no session handle, and `loadLiveCityLayout` only reads"*. Half of that is
 * still true and load-bearing — the engine is untouched, and `hardWinterDamage` is a pure
 * projection of its state — but a write path now exists at the SURFACE
 * (`scarLiveCity.ts`), behind an explicit button in the outcome panel, because a crisis that
 * could damage a city the city could never remember was the blocking defect the whole crisis
 * programme was waiting on.
 *
 * So the promise is now *"unless you asked"*, and the two halves are measured separately:
 *
 *  - THIS FILE plays the whole destructive winter and never presses the button. The
 *    byte-identity assertion is unchanged. What it gained is one line asserting the button is
 *    THERE and was not pressed — because "the blob did not move" and "there is no way to move
 *    it" are indistinguishable outcomes, and only the first is the claim.
 *  - `liveCityScar.test.tsx` plays the same winter over the same fixture, presses the button,
 *    and asserts the blob DID move and carries exactly the damage the winter did. Without it,
 *    the assertion here would go green over a write path that had silently broken.
 */

/** A city with something in every rim band, so the winter has a real board to ruin. */
const SAVED_CITY = {
  version: DEV_SESSION_SCHEMA_VERSION,
  saved_at: "2026-07-29T12:00:00.000Z",
  city: {
    node_states: [],
    neighborhood_states: [],
    placements: [
      { nodeId: "NUM.5", col: 4, row: 0, rot: 0 },
      { nodeId: "NUM.4", col: -4, row: -3, rot: 0 },
      { nodeId: "NUM.F", col: 2, row: 2, rot: 0 },
      { nodeId: "NUM.3", col: 0, row: 2, rot: 0 },
      { nodeId: "NUM.2", col: -3, row: -2, rot: 0 },
    ],
    roads: [{ col: 1, row: 0 }],
    road_gold_spent: 40,
    town_hall: { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM },
  },
};

let key = "";
let before = "";

beforeEach(() => {
  key = devSessionStore.storageKey();
  window.localStorage.setItem(key, JSON.stringify(SAVED_CITY));
  before = window.localStorage.getItem(key) as string;
  expect(before.length).toBeGreaterThan(0);
});

afterEach(() => {
  window.localStorage.removeItem(key);
});

/** Answer a round with `correct` of three right, through the real checker. */
async function answerBatch(
  user: ReturnType<typeof userEvent.setup>,
  round: number,
  correct: number,
): Promise<void> {
  const batch = winterBatchFor({
    masteredNodeIds: WINTER_NODE_ORDER,
    encounter: 1,
    round,
  });
  if (batch.status !== "ready") {
    throw new Error(batch.message);
  }
  for (const [index, prompt] of batch.prompts.entries()) {
    const answerKey = winterFrozenItem(prompt.item_version_id)?.answer.answer_key;
    if (typeof answerKey !== "string") {
      throw new Error(`no text answer key for ${prompt.item_version_id}`);
    }
    const field = await screen.findByRole("textbox");
    await user.clear(field);
    await user.type(field, index < correct ? answerKey : wrongButReadable(answerKey));
    await user.click(screen.getByRole("button", { name: "Check" }));
    await user.click(
      screen.getByRole("button", {
        name: index + 1 >= batch.prompts.length ? /See what you earned/i : /Next question/i,
      }),
    );
  }
}

describe("the winter falls on a snapshot, never on the city", () => {
  it("opens on the saved city rather than on an authored fixture", () => {
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    // The board is his, and the surface says so where he will see it first.
    expect(screen.getByText(/Falling on/).textContent).toContain("your own city");
    expect(screen.getByText(/snapshot of your saved city/i)).toBeVisible();

    // Six buildings — the five skills plus the hall — on the cells the city has them on.
    expect(document.querySelectorAll(".hw-grid [data-node]")).toHaveLength(6);
    expect(
      document.querySelector('.hw-grid [data-cell="4,0"]')?.getAttribute("data-node"),
    ).toBe("NUM.5");
    // The hall is on the board and named as the hub, not as its sentinel id.
    const hall = document.querySelector(`[data-node="${TOWN_HALL_ID}"]`);
    expect(hall).not.toBeNull();
    expect(hall?.getAttribute("aria-label") ?? "").not.toContain("town-hall");
  });

  /**
   * The whole encounter, played to the end, answering nothing right, so the frost takes every
   * building it reaches. If any of it reached the session, the blob would move.
   *
   * **IT OPENED WITH A PULL-BACK UNTIL 2026-08-02**, which was the action that ruined ground for
   * good and took a building with it: the most destructive thing the encounter could do. The lead
   * ruled it out, so the most destructive thing left is a whole winter answered wrong, which is
   * what this plays. The claim is unchanged — nothing the winter does reaches the saved city — and
   * it is measured over the worst board the encounter can still produce.
   */
  it("leaves the saved city byte-identical after a whole winter is played over it", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
      await user.click(screen.getByRole("button", { name: /Light a fire/i }));
      const cell = document.querySelector<HTMLElement>('[data-cell="0,0"]');
      if (!cell) {
        throw new Error("no centre cell");
      }
      await user.click(cell);
      await user.click(
        screen.getByRole("button", { name: /Commit and face 3 questions/i }),
      );
      await answerBatch(user, round, 0);
      await user.click(screen.getByRole("button", { name: /Let the frost advance/i }));
    }

    // The winter really did happen, and really did destroy things.
    const report = screen.getByTestId("hw-conclusion");
    // The verdict is derived, so a winter this bad says so rather than reporting a count. The
    // whole ladder is `winterConclusion.test.ts`'s claim; here it is enough that the screen is
    // not congratulating anybody.
    // `lost` rather than `mauled`, and it is a census rather than a bound: a whole winter answered
    // wrong takes every building at `HARD_WINTER.damage.ruin_at: 1`, where the pull-back opening
    // this replaced left a survivor or two behind. It was `mauled` until 2026-08-02.
    expect(report.dataset.verdict).toBe("lost");
    expect(report.textContent).toMatch(/Nothing came through the winter/);
    // THE GROUND HALF IS AN ABSENCE NOW. It read "Ground given up for good" and counted abandoned
    // cells on the board; the action is gone, so the destruction this test is about is buildings —
    // and the ground line must NOT appear, which is the direction that would catch it coming back.
    expect(report.textContent).not.toMatch(/Ground given up for good/);
    expect(document.querySelectorAll(".hw-grid .hw-cell--abandoned")).toHaveLength(0);
    expect(document.querySelectorAll(".hw-grid .hw-cell--ruin").length).toBeGreaterThan(0);

    // AND THE CITY IS EXACTLY WHERE HE LEFT IT.
    expect(window.localStorage.getItem(key)).toBe(before);

    // BECAUSE NOBODY ASKED. The one control that would have written is on screen, enabled,
    // and untouched — so the byte-identity above is a fact about this winter rather than about
    // there being no way to write at all. `liveCityScar.test.tsx` presses it over this same
    // fixture and asserts the blob moves, which is what stops this line passing for the wrong
    // reason if the write path ever breaks.
    const carry = screen.getByRole("button", {
      name: /Carry this damage back to my city/i,
    });
    expect(carry).toBeEnabled();
  }, 90000);

  it("re-reads the city on a new winter, so a rearranged island is the one that plays", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);
    expect(
      document.querySelector('.hw-grid [data-cell="4,0"]')?.getAttribute("data-node"),
    ).toBe("NUM.5");

    // He alt-tabs, moves the Tower off the shore, and comes back.
    const moved = structuredClone(SAVED_CITY);
    const tower = moved.city.placements.find((p) => p.nodeId === "NUM.5");
    if (!tower) {
      throw new Error("no tower");
    }
    tower.col = 0;
    tower.row = -2;
    window.localStorage.setItem(key, JSON.stringify(moved));

    await user.click(
      screen.getByRole("button", { name: /New winter \(deals the next city/i }),
    );

    expect(
      document.querySelector('.hw-grid [data-cell="4,0"]')?.getAttribute("data-node"),
    ).toBeNull();
    expect(
      document.querySelector('.hw-grid [data-cell="0,-2"]')?.getAttribute("data-node"),
    ).toBe("NUM.5");
  });

  /**
   * A city can vanish BETWEEN winters — he goes back, clears the session, comes here and
   * presses "New winter". The preference is still "live" and there is nothing to be live
   * about, so this is the path that would hand `createHardWinter` an empty building list
   * and end every winter flawless over an island with nothing on it.
   */
  it("falls back to the authored boards when the city disappears between winters", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);
    expect(screen.getByText(/Falling on/).textContent).toContain("your own city");

    window.localStorage.removeItem(key);
    await user.click(
      screen.getByRole("button", { name: /New winter \(deals the next city/i }),
    );

    // An authored board, with buildings on it, and the refusal explaining the swap.
    expect(screen.queryByText(/Falling on/)).toBeNull();
    expect(screen.getByText(/This city:/)).toBeVisible();
    expect(document.querySelectorAll(".hw-grid [data-node]")).toHaveLength(6);
    expect(screen.getByText(/holds no saved city yet/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Your city" })).toBeDisabled();
  });

  it("falls back to the authored boards when there is no city to read", () => {
    window.localStorage.removeItem(key);
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    // The authored cycle's first board, not a crash and not an empty island.
    expect(screen.getByText(/This city:/).textContent).toContain("Spread out");
    expect(screen.queryByText(/snapshot of your saved city/i)).toBeNull();
    expect(document.querySelectorAll(".hw-grid [data-node]")).toHaveLength(6);

    // And the chip that would have opened his city says why it cannot.
    const chip = screen.getByRole("button", { name: "Your city" });
    expect(chip).toBeDisabled();
    expect(screen.getByText(/holds no saved city yet/)).toBeVisible();
  });
});
