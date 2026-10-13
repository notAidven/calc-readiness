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
 * **THE OTHER HALF OF THE SANDBOX PROMISE: asking really does write.**
 *
 * `liveCitySandbox.test.tsx` asserts the saved blob is byte-identical after a whole winter is
 * played over it. That claim was unfalsifiable while no write path existed at all — it and a
 * broken detector looked the same — so it is now paired with this: the SAME fixture, the SAME
 * winter, one button pressed, and the blob must move.
 *
 * Together they say the thing that is actually true of the feature: *a winter does not touch
 * your city unless you ask it to.* Neither half means much alone.
 *
 * The write itself is `scarLiveCity.ts`, the only module in the winter that touches storage.
 */

/** The same saved city the sandbox test uses, so the two are comparing one board. */
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
  for (let index = 0; index < batch.prompts.length; index += 1) {
    const field = await screen.findByRole("textbox");
    // READ OFF THE SCREEN, not off the predicted batch. Over an authored board the surface's own
    // draw and this prediction come apart, and answering item B's key into item A's field used to
    // pass only because the crisis banked whatever the grader said. Now a shape-inappropriate
    // answer is REFUSED, the round never advances, and the drift shows up as a hang.
    const served =
      document
        .querySelector("[data-item-version-id]")
        ?.getAttribute("data-item-version-id") ?? "";
    const answerKey = winterFrozenItem(served)?.answer.answer_key;
    if (typeof answerKey !== "string") {
      throw new Error(`no text answer key for the served item ${served}`);
    }
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

/**
 * Play the whole winter destructively: answer nothing right, every round.
 *
 * **ROUND ONE GAVE UP THE SHORE UNTIL 2026-08-02**, so this winter ended with both kinds of damage
 * and the carry-back below had cells as well as buildings to write. The give-up-ground action was
 * ruled out, so a winter's damage is buildings alone and the ground half of these tests is
 * re-derived rather than re-fixtured.
 */
async function playARuinousWinter(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
    await user.click(screen.getByRole("button", { name: /Light a fire/i }));
    const cell = document.querySelector<HTMLElement>('[data-cell="0,0"]');
    if (!cell) {
      throw new Error("no centre cell");
    }
    await user.click(cell);
    await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));
    await answerBatch(user, round, 0);
    await user.click(screen.getByRole("button", { name: /Let the frost advance/i }));
  }
}

describe("carrying a winter back to the real city", () => {
  it("writes the damage the winter did, and only when the button is pressed", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);
    await playARuinousWinter(user);

    // The board really was ruined, and the city is STILL byte-identical — the write has not
    // happened yet, which is what makes the next click the thing under test.
    // Read off the CONCLUDING SCREEN, which is where the winter's damage is now reported: the
    // outcome panel it replaces was a fourth card in the same rail as the question panel.
    const report = screen.getByTestId("hw-conclusion");
    // It read /Ground given up for good/, which was the pull-back's own line. The action is gone, so
    // what the card reports is the buildings, and the ground line is asserted absent below.
    expect(report.textContent).toMatch(/Nothing came through the winter/);
    expect(report.textContent).not.toMatch(/Ground given up for good/);
    expect(window.localStorage.getItem(key)).toBe(before);

    const carry = screen.getByRole("button", {
      name: /Carry this damage back to my city/i,
    });
    await user.click(carry);

    // AND NOW IT MOVED.
    const after = window.localStorage.getItem(key) as string;
    expect(after).not.toBe(before);

    const saved = JSON.parse(after) as {
      city: {
        placements: readonly { nodeId: string }[];
        crisis_damage: {
          next_damage_id: number;
          ruined_buildings: readonly { node_id: string; damage_id: string }[];
          ruined_cells: readonly { cell: string; damage_id: string }[];
        };
      };
    };
    const damage = saved.city.crisis_damage;

    // Floors, because every claim below would hold trivially over an empty record. **THE CELL
    // FLOOR IS NOW A CENSUS OF ZERO**: it read `toBeGreaterThanOrEqual(1)` over a winter that opened
    // with a pull-back, and no winter can scar ground since 2026-08-02, so the honest assertion is
    // that the carry-back writes buildings and NO cells — which is also what would catch a
    // carry-back that started shipping frozen ground across.
    expect(damage.ruined_buildings.length).toBeGreaterThanOrEqual(1);
    expect(damage.ruined_cells).toEqual([]);
    expect(damage.next_damage_id).toBe(2);
    for (const record of [...damage.ruined_buildings, ...damage.ruined_cells]) {
      expect(record.damage_id).toBe("d1");
    }

    // NOTHING WAS REMOVED. Every placement the city had is still in the city, which is the
    // failure floor at its narrowest: a crisis records a state and never a deletion.
    expect(saved.city.placements.map((p) => p.nodeId).sort()).toEqual(
      SAVED_CITY.city.placements.map((p) => p.nodeId).sort(),
    );
    // ...and the ruins name placements the city actually has (the hall included, which the
    // winter puts on the board), rather than inventing a subject nothing can repair.
    const owned = new Set([
      ...SAVED_CITY.city.placements.map((p) => p.nodeId),
      TOWN_HALL_ID,
    ]);
    for (const record of damage.ruined_buildings) {
      expect(owned.has(record.node_id), record.node_id).toBe(true);
    }
    // The rest of the blob is untouched: the roads and their spend are exactly as they were.
    expect(saved.city).toMatchObject({
      roads: SAVED_CITY.city.roads,
      road_gold_spent: SAVED_CITY.city.road_gold_spent,
    });

    // Pressing it again is refused rather than folding a second damage id over the same
    // winter, which would burn a mint and re-stamp nothing.
    expect(carry).toBeDisabled();
    expect(screen.getByRole("status").textContent).toMatch(/Marked on your city/i);
  }, 120000);

  /**
   * **THE BUTTON PROMISES TWO THINGS AND USED TO DO ONE.**
   *
   * *"Carry this damage back to my city"* both records the winter and goes back to the city,
   * and only the record was wired: the write landed, the status line said so, and the player
   * was left standing in a finished winter with the city they had just marked out of reach.
   *
   * Asserted in BOTH directions, because "leaves on a click" and "leaves when the write
   * actually happened" are different claims and only the second is the one wanted — a leave
   * fired on a refusal would take the player away from the message explaining why nothing
   * happened, which is worse than not leaving at all.
   */
  it("goes back to the city on a real record, and stays put on a refusal", async () => {
    const user = userEvent.setup();
    const left: string[] = [];
    render(
      <HardWinterSurface
        readMasteredNodes={allPractised}
        onLeave={() => left.push("leave")}
      />,
    );
    await playARuinousWinter(user);

    const carry = screen.getByRole("button", {
      name: /Carry this damage back to my city/i,
    });
    // Nothing has been asked for yet, so nothing has been left.
    expect(left).toEqual([]);

    await user.click(carry);

    // THE WRITE HAPPENED...
    expect(screen.getByRole("status").textContent).toMatch(/Marked on your city/i);
    expect(window.localStorage.getItem(key)).not.toBe(before);
    // ...AND SO DID THE LEAVE, exactly once.
    expect(left).toEqual(["leave"]);
  }, 120000);

  it("stays in the winter when the carry-back is refused, so its message can be read", async () => {
    const user = userEvent.setup();
    const left: string[] = [];
    render(
      <HardWinterSurface
        readMasteredNodes={allPractised}
        onLeave={() => left.push("leave")}
      />,
    );
    await playARuinousWinter(user);

    // The refusal, injected rather than hoped for: the surface read the live city at mount,
    // so taking the saved blob away now is a board that has damage to record and nowhere to
    // record it. Without this the refusal branch is unreachable from a live board.
    window.localStorage.removeItem(key);

    const carry = screen.getByRole("button", {
      name: /Carry this damage back to my city/i,
    });
    await user.click(carry);

    // REFUSED, and the player is still here to read why.
    const status = screen.getByRole("status");
    expect(status.className).toContain("hw-refusal");
    expect(status.textContent).not.toMatch(/Marked on your city/i);
    expect(left).toEqual([]);
    // Still offered, because a refusal is not a spent button.
    expect(carry).not.toBeDisabled();
  }, 120000);

  it("offers no write at all over an AUTHORED board, because those ruins are nobody's", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);
    // Switch to an authored layout, which is what the dev chips are for.
    await user.click(screen.getByRole("button", { name: "Spread out" }));
    expect(screen.getByText(/This city:/).textContent).toContain("Spread out");
    await playARuinousWinter(user);

    expect(screen.queryByTestId("hw-conclusion")).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: /Carry this damage back to my city/i }),
    ).toBeNull();
    expect(window.localStorage.getItem(key)).toBe(before);
  }, 120000);
});
