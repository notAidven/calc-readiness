import { HARD_WINTER, winterFireState } from "@cr/game";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, type Mock, vi } from "vitest";
import { wrongButReadable } from "../../test/wrongButReadable";
import {
  WINTER_NODE_ORDER,
  winterBatchFor,
  winterFrozenItem,
} from "../../winter/hardWinterItems";
import type { PlacedTransform } from "../worldLayout";
import { type WinterCityBoard, WinterInCity } from "./WinterInCity";

/**
 * **THE CRISIS ENDS, AND THE ISLAND GOES BACK TO BEING THE ISLAND — with its scars.**
 *
 * The team lead: *"ensure that after the era 1 crisis is finished, the non-damaged tiles /
 * general environment revert to how they were before to signify the crisis being over."* The
 * atmosphere reverts, the damage persists.
 *
 * THE DEFECT: the reducer's last `end_round` never clears `state.frozen`, so a finished winter
 * still projects every frozen cell, and the in-city mount kept publishing those rows for as
 * long as the outcome panel was up. The player finished the crisis and the world stayed
 * wintered, so nothing signalled that it was over.
 *
 * `../../winter/thaw.test.ts` owns the pure function and reproduces the engine-side defect. This
 * file owns the half that only the real surface can answer: that the board the CITY IS HANDED
 * is thawed, that the ground the settlement gave up survives on the city's own durable layer,
 * and that a running winter is untouched — driven by playing a whole three-round winter through
 * the shipped panels, because the phase transition is what triggers the revert and a fixture
 * cannot press the button that causes it.
 */

const FIRST_ENCOUNTER = 1;

function placed(nodeId: string, col: number, row: number): PlacedTransform {
  return { nodeId, col, row, rot: 0 };
}

/** Three skills on the island, deliberately unlike any authored layout. */
const THREE_SKILLS: readonly PlacedTransform[] = [
  placed("NUM.S", 2, 2),
  placed("NUM.F", 0, 3),
  placed("NUM.2", -2, 1),
];

type BoardSpy = Mock<(board: WinterCityBoard | null) => void>;

/** The answer keys of the batch the surface will draw for a round of encounter one. */
function answerKeysFor(round: number): string[] {
  const batch = winterBatchFor({
    masteredNodeIds: WINTER_NODE_ORDER,
    encounter: FIRST_ENCOUNTER,
    round,
  });
  if (batch.status !== "ready") {
    throw new Error(`no batch for round ${round}: ${batch.message}`);
  }
  return batch.prompts.map((prompt) => {
    const key = winterFrozenItem(prompt.item_version_id)?.answer.answer_key;
    if (typeof key !== "string") {
      throw new Error(`no text answer key for ${prompt.item_version_id}`);
    }
    return key;
  });
}

/** Answer the round's batch, every one of them right, through the REAL checker. */
async function answerBatch(
  user: ReturnType<typeof userEvent.setup>,
  round: number,
  // How many to get right. Defaults to all of them, which is every caller but the one that needs a
  // fire short enough to burn out inside a three-round winter.
  correct = Number.POSITIVE_INFINITY,
): Promise<void> {
  const keys = answerKeysFor(round);
  for (const [index, key] of keys.entries()) {
    const field = await screen.findByRole("textbox");
    await user.clear(field);
    await user.type(field, index < correct ? key : wrongButReadable(key));
    await user.click(screen.getByRole("button", { name: "Check" }));
    await user.click(
      screen.getByRole("button", {
        // The last answer's button is what commits the round now that the "Resolve" control
        // is gone (#319), and its label moved with it: "See what you earned".
        name: index + 1 >= keys.length ? /See what you earned/i : /Next question/i,
      }),
    );
  }
}

/** The last non-null board the city was handed. */
function lastBoard(onBoard: BoardSpy): WinterCityBoard {
  const boards = onBoard.mock.calls.map((c) => c[0]).filter((b) => b !== null);
  const board = boards[boards.length - 1];
  if (!board) {
    throw new Error("the winter never published a board to the city");
  }
  return board;
}

function landCells(board: WinterCityBoard) {
  return board.rows.flat().filter((cell) => cell.land);
}

describe("the winter's ending reverts the island the city is showing", () => {
  it("publishes a thawed board once the crisis is over, and keeps the ruins and the scars", async () => {
    const user = userEvent.setup();
    const onBoard: BoardSpy = vi.fn();
    render(
      <WinterInCity
        placements={THREE_SKILLS}
        townHall={null}
        canvasLive
        // The same set `answerKeysFor` above draws its batch from, so the questions this
        // test answers are the questions the surface actually asks.
        practisedNodeIds={WINTER_NODE_ORDER}
        onBoard={onBoard}
        onExit={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: /The Hard Winter/i }, { timeout: 20000 });
    await waitFor(() => expect(onBoard).toHaveBeenCalled());

    // **ROUND ONE USED TO GIVE UP THE OUTER RING**, so the finished board carried ground that
    // had to survive the thaw — the half the lead singled out to keep. That action was ruled out
    // on 2026-08-02, so there is no scarred ground to publish and round one is a fire like the
    // rest: what this test now measures is that the weather reverts and the RUINS stay.
    await user.click(screen.getByRole("button", { name: /Light a fire/i }));
    await act(async () => lastBoard(onBoard).onAimCell?.(-3, -4));
    await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));
    // No "Resolve" step: #319 deleted that button and moved the commit it carried onto the
    // last answer, so `answerBatch`'s final "See what it bought" is what resolves the round.
    // ONE of three, so this fire is `weak` and burns two rounds: at `HARD_WINTER.rounds: 3` a
    // `strong` fire lit in round one is still burning when the winter ends and no hearth on the
    // board is ever spent.
    await answerBatch(user, 1, 1);
    await user.click(screen.getByRole("button", { name: /Let the frost advance/i }));

    // MID-WINTER: the crisis is on the island. This is the control for everything below —
    // without it a board that published a thawed island from the first frame would pass.
    const running = lastBoard(onBoard);
    expect(running.ended).toBe(false);
    expect(landCells(running).filter((cell) => cell.frozen).length).toBeGreaterThan(20);
    expect(running.scarredCells).toEqual([]);

    // The rest of the winter, on fires, so buildings fall and there are ruins to keep.
    //
    // ROUND ONE'S FIRE IS THE ONE NEVER RE-LIT, which is what makes a SPENT hearth reachable
    // here: it is out of fuel by the last round and stands there dark, while the heart's hearth is
    // lit later and is still burning at the end. It was round TWO's fire until 2026-08-02, when
    // round one stopped being spent on a pull-back.
    //
    // **AND ROUND ONE IS ANSWERED AT ONE OF THREE**, which is the other half of reaching a spent
    // hearth at `HARD_WINTER.rounds: 3`: a `strong` fire burns three rounds, so one lit at full
    // marks in round one is still burning when the winter ends. A `weak` fire buys two rounds and
    // is spent as round two closes, leaving the last round to observe it in.
    let spentBoard: WinterCityBoard | null = null;
    for (let round = 2; round <= HARD_WINTER.rounds; round += 1) {
      const aim = [0, 0] as const;
      await user.click(screen.getByRole("button", { name: /Light a fire/i }));
      await act(async () => lastBoard(onBoard).onAimCell?.(aim[0], aim[1]));
      await user.click(
        screen.getByRole("button", { name: /Commit and face 3 questions/i }),
      );
      await answerBatch(user, round);
      await user.click(screen.getByRole("button", { name: /Let the frost advance/i }));
      const board = lastBoard(onBoard);
      if (!board.ended && board.fires.some((f) => winterFireState(f) === "spent")) {
        spentBoard = board;
      }
    }

    // A SPENT HEARTH REACHES THE RENDERER WHILE THE WINTER RUNS, which is the whole point of
    // keeping it on the board: the island has to be able to draw dark stones. Read off a RUNNING
    // board, because the thaw below is what takes them away again.
    const stillPlaying = spentBoard;
    expect(stillPlaying, "no hearth in this winter ever burnt out").not.toBeNull();
    const midStates = (stillPlaying as WinterCityBoard).fires.map(winterFireState).sort();
    expect(midStates).toEqual(["burning", "spent"]);

    expect(screen.getByText("Winter is over")).toBeVisible();
    const over = lastBoard(onBoard);
    expect(over.ended).toBe(true);

    // THE ATMOSPHERE REVERTS. A floor first, because "no cell is frozen" is satisfied by a
    // board with no cells: the island is still all 88 of its cells.
    const land = landCells(over);
    expect(land).toHaveLength(88);
    expect(land.filter((cell) => cell.frozen)).toHaveLength(0);
    expect(land.filter((cell) => cell.frost_line)).toHaveLength(0);
    expect(land.filter((cell) => cell.warded)).toHaveLength(0);
    // ...AND THE HEARTHS COME DOWN WITH IT, SPENT ONES INCLUDED — the winter's own decision about
    // what a spent hearth is: gear the settlement laid down while the crisis was on rather than
    // damage the crisis did, so it reverts with the weather and is billed nowhere. The floor is
    // the mid-winter board above, which really did carry two hearths in two different states.
    //
    // (This floor read `running.fires.length + 1 > 0` until 2026-08-02, which is true of every
    // possible board: `running` is captured after round one, where nothing has been lit yet, so
    // the `+ 1` made a vacuous assertion out of one that could not hold where it stood.)
    expect((stillPlaying as WinterCityBoard).fires.length).toBeGreaterThan(1);
    expect(over.fires).toHaveLength(0);

    // **NO SCARRED GROUND CROSSES, because no winter can make any.** This asserted one key per
    // abandoned cell against the mid-winter count; the action is gone, so what is asserted is
    // that the seam invents none — the layer, the persisted column and the reclaim price are all
    // still live for a city carrying scars saved before the ruling.
    expect(over.scarredCells).toEqual([]);
    // The ruins are still ruins, and they are what the durable half of this test now rests on.
    // Every building is still on the board either way, because a ruin is a state and not a
    // removal.
    expect(over.ruinedNodeIds.size).toBeGreaterThan(0);
    expect(land.filter((cell) => cell.building !== null)).toHaveLength(THREE_SKILLS.length);
  }, 120000);
});
