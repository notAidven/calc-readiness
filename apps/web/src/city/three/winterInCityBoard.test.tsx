import { HARD_WINTER } from "@cr/game";
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
 * **THE SEAM THAT PUTS THE CRISIS ON THE CITY'S OWN CANVAS.**
 *
 * The lead's ruling is that the winter happens in the in-game screen, and the mechanism is
 * one hop: `HardWinterSurface` owns the winter's state privately, `renderBoard` hands one
 * moment of it out, and this component republishes that as the four props `CityScene` already
 * takes. Everything drawn on the island — frost, the frost line, wards, fires, ruins — goes
 * through this hop, so a hop that publishes the wrong thing, or stops publishing, or never
 * stops, is the whole feature failing quietly.
 *
 * The canvas itself is not testable here (jsdom has no WebGL, and `CityCanvasHost` fails
 * closed to the DOM roster by design). What IS testable here is everything up to the canvas
 * boundary, which is where all four of this seam's real defects live:
 *
 *  1. the board is published at all, and carries the engine's own rows rather than a re-derived
 *     grid;
 *  2. it is withdrawn on the way out, so leaving the winter puts the island back;
 *  3. it is THIS city, read from the placements on screen and not from storage;
 *  4. an island with nothing on it is refused rather than quietly swapped for an authored
 *     layout the canvas behind is not showing.
 *
 * `winterGround.test.ts` covers what the renderer does with the board once it arrives, and
 * `winterEntryRoute.test.tsx` covers the way in.
 */

function placed(nodeId: string, col: number, row: number): PlacedTransform {
  return { nodeId, col, row, rot: 0 };
}

/** Two skills on the island, deliberately unlike any authored layout. */
const TWO_SKILLS: readonly PlacedTransform[] = [
  placed("NUM.S", 2, 2),
  placed("NUM.F", 0, 3),
];

type BoardSpy = Mock<(board: WinterCityBoard | null) => void>;

function mount(overrides: {
  placements?: readonly PlacedTransform[];
  townHall?: PlacedTransform | null;
  canvasLive?: boolean;
  practisedNodeIds?: readonly string[];
  onExit?: () => void;
}) {
  const onBoard: BoardSpy = vi.fn();
  const onExit = overrides.onExit ?? vi.fn();
  const view = render(
    <WinterInCity
      placements={overrides.placements ?? TWO_SKILLS}
      townHall={overrides.townHall ?? null}
      canvasLive={overrides.canvasLive ?? true}
      // Every era-one node, because these tests drive whole rounds and the batch has to be
      // servable. What the crisis does with a NARROWER real set is
      // `crisisQuestionPool.test.ts`'s claim, not this file's.
      practisedNodeIds={overrides.practisedNodeIds ?? WINTER_NODE_ORDER}
      onBoard={onBoard}
      onExit={onExit}
    />,
  );
  return { view, onBoard, onExit };
}

/**
 * The winter's surface is `lazy`, so the first mount in this file pays the dynamic import.
 * Waited on explicitly rather than left to the default timeout, which the first test in the
 * file loses to the chunk on a cold run.
 */
async function winterIsUp(): Promise<void> {
  await screen.findByRole("heading", { name: /The Hard Winter/i }, { timeout: 20000 });
}

/**
 * The answer keys of the batch the surface will draw for a round of encounter one.
 *
 * Borrowed from `HardWinterSurface.test.tsx`, which explains why it is possible at all: the
 * draw is seeded on `(encounter, round)`, so a test can look up the exact three questions and
 * type their real keys. This file needs it for one round only, and only since
 * `HARD_WINTER.damage.ruin_at: 2` made a scar reachable exclusively through a partial shield.
 */
function answerKeysFor(round: number): string[] {
  const batch = winterBatchFor({
    masteredNodeIds: WINTER_NODE_ORDER,
    encounter: 1,
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

/** The last non-null board the city was handed. */
function lastBoard(onBoard: BoardSpy): WinterCityBoard {
  const boards = onBoard.mock.calls.map((c) => c[0]).filter((b) => b !== null);
  const board = boards[boards.length - 1];
  if (!board) {
    throw new Error("the winter never published a board to the city");
  }
  return board;
}

describe("the winter publishes its board to the city that is already on screen", () => {
  it("hands over the engine's own rows, its fires and its ruins", async () => {
    const { onBoard } = mount({});
    await winterIsUp();
    await waitFor(() => expect(onBoard).toHaveBeenCalled());

    const board = lastBoard(onBoard);
    // The island the engine models is 88 buildable cells inside a bounding box of rows, so a
    // board that published an empty grid — the shape a broken projection produces — cannot
    // satisfy this.
    const cells = board.rows.flat();
    expect(cells.filter((c) => c.land)).toHaveLength(88);
    expect(board.rows.length).toBeGreaterThanOrEqual(9);
    // Round one: nothing declared, nothing wrecked. Both are real states rather than
    // placeholders, and both have to arrive as themselves.
    expect(board.fires).toHaveLength(0);
    expect(board.ruinedNodeIds.size).toBe(0);
    expect(board.frostStageByNodeId.size).toBe(0);
    // The ground is inert until an action is chosen, so the camera keeps the drag.
    expect(board.onAimCell).toBeNull();
  });

  /**
   * **THE THIRD BUILDING STATE HAS TO CROSS THIS HOP TOO.** Ruins did from the start; damage
   * is newer, and a hop that publishes ruins and not damage is the failure that reads as "the
   * damage model does not work on the island" while the 2D board shows it perfectly.
   *
   * `NUM.S` is placed at (2, 2) here, which is two cells from the shore, so the frost reaches
   * it in round three.
   *
   * ## ⚑ THE STAGE IT HANDED OVER IS UNREACHABLE SINCE 2026-08-02, SO THIS INVERTS
   *
   * The history is worth two paragraphs because each retune narrowed the state further and this
   * one closes it.
   *
   * It used to waste rounds at zero accuracy until something was marked, on the reasoning that how
   * many rounds the tuning takes is not this file's business. `HARD_WINTER.damage.ruin_at: 2` made
   * that loop unable to succeed — an unsheltered cold round was the whole building, so a wasted
   * winter published RUINS and never a stage — and the plan became exact: *"two rounds thrown away;
   * round three pulls everyone inward at two of three, which hands every building inside a
   * four-point shield; the frost reaches `NUM.S` as that round closes and the shield pays the
   * two-point bite, leaving two points of it. Round four bites for three, the shield covers two,
   * and one point lands."*
   *
   * At `ruin_at: 1` **no plan reaches a marked standing building**, proved over the whole
   * shield-by-bite space in `hard-winter.test.ts`'s *"a building is sound or it is a ruin"*. And the
   * action that plan's third round used is gone as well.
   *
   * So what the board owes is the inverse, asserted as a CENSUS rather than as a silence: over a
   * whole winter, at every accuracy the surface can be driven to, `frostStageByNodeId` is empty at
   * every hop — and the loss the frost did do arrives on `ruinedNodeIds` instead. That is the
   * assertion that fails if a `ruin_at` with room in it comes back and the board forgets to publish
   * the stage, which is the direction this hop actually protects.
   */
  it("publishes no frost stage at all, because a building is sound or it is a ruin", async () => {
    const user = userEvent.setup();
    const { onBoard } = mount({});
    await winterIsUp();
    await waitFor(() => expect(onBoard).toHaveBeenCalled());

    const answer = async (round: number, correct: number): Promise<void> => {
      const keys = answerKeysFor(round);
      for (const [index, key] of keys.entries()) {
        const field = await screen.findByRole("textbox");
        await user.type(field, index < correct ? key : wrongButReadable(key));
        await user.click(screen.getByRole("button", { name: "Check" }));
        await user.click(
          screen.getByRole("button", { name: /Next question|See what you earned/i }),
        );
      }
      await user.click(screen.getByRole("button", { name: /Let the frost advance/i }));
    };

    // A whole winter, at a different accuracy each round so the sweep covers the tiers a shield
    // can be bought at as well as the ones it cannot: a fire in the far corner where it holds
    // nothing, which is the line most likely to leave something marked if anything could be.
    let hops = 0;
    for (const [round, correct] of [
      [1, 0],
      [2, 1],
      [3, 2],
    ] as const) {
      await user.click(screen.getByRole("button", { name: /Light a fire/i }));
      await waitFor(() => expect(lastBoard(onBoard).onAimCell).not.toBeNull());
      await act(async () => lastBoard(onBoard).onAimCell?.(-3, -5));
      await user.click(
        screen.getByRole("button", { name: /Commit and face 3 questions/i }),
      );
      await answer(round, correct);
      // THE CENSUS, at every hop rather than only at the end: a stage published mid-winter and
      // cleared before the last round would pass an end-of-winter check.
      expect(
        [...lastBoard(onBoard).frostStageByNodeId.entries()],
        `round ${round} published a frost stage`,
      ).toEqual([]);
      hops += 1;
    }
    expect(hops).toBe(HARD_WINTER.rounds);

    // AND THE LOSS ARRIVED, on the set that carries it. Without this the emptiness above is
    // satisfied by a winter in which the frost reached nothing at all.
    const finished = lastBoard(onBoard);
    expect(finished.ruinedNodeIds.size, "the frost took nothing").toBeGreaterThan(0);
    // A node is never in both sets, which was the original claim's other half and is now trivially
    // true of one side. Asserted anyway, because it is what a restored `ruin_at` needs.
    for (const nodeId of finished.ruinedNodeIds) {
      expect(finished.frostStageByNodeId.has(nodeId)).toBe(false);
    }
  }, 60000);

  it("arms the ground only while a fire is being aimed", async () => {
    const user = userEvent.setup();
    const { onBoard } = mount({});
    await winterIsUp();
    await waitFor(() => expect(onBoard).toHaveBeenCalled());
    expect(lastBoard(onBoard).onAimCell).toBeNull();

    await user.click(screen.getByRole("button", { name: /Light a fire/i }));
    await waitFor(() => expect(lastBoard(onBoard).onAimCell).not.toBeNull());

    // A pick on the island really does reach the engine: the declaration line changes from
    // "Nothing declared yet" to the cell that was aimed at.
    await act(async () => lastBoard(onBoard).onAimCell?.(1, 1));
    expect(screen.getByText(/Light a fire at column 1, row 1/i)).toBeVisible();
  });

  it("drops a pick that is not on the island rather than declaring it", async () => {
    const user = userEvent.setup();
    const { onBoard } = mount({});
    await winterIsUp();
    await user.click(screen.getByRole("button", { name: /Light a fire/i }));
    await waitFor(() => expect(lastBoard(onBoard).onAimCell).not.toBeNull());

    // Far off the bounding box — a click on the lagoon or past the shore.
    await act(async () => lastBoard(onBoard).onAimCell?.(99, 99));
    expect(screen.getByText(/Nothing declared yet/i)).toBeVisible();
    // ...and it is DROPPED rather than passed on and refused. The distinction is the whole
    // assertion: the engine rejects an off-island fire either way, so "nothing was declared"
    // is satisfied by a renderer that forwards every stray click and lets the winter say no.
    // What the player would then see is a red refusal for a click on the lagoon, which is the
    // board accusing them of a declaration they did not make.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("routes a click on a BUILDING to the winter, which is how Reinforce is aimed", async () => {
    const user = userEvent.setup();
    const { onBoard } = mount({});
    await winterIsUp();
    await user.click(screen.getByRole("button", { name: /Reinforce a building/i }));
    await waitFor(() => expect(onBoard).toHaveBeenCalled());

    await act(async () => lastBoard(onBoard).onPickBuilding("NUM.S"));
    // The declaration NAMES the building that was clicked, so the pick resolved to a real
    // placement rather than being swallowed. Read off the live region, because "Reinforce"
    // is also the mode button's own label and matching that would pass without a pick.
    expect(screen.getByText(/^Reinforce the /i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Commit and face \d+ questions/i }),
    ).toBeEnabled();
  });

  it("withdraws the board when the winter comes down, so the island goes back to normal", async () => {
    const { view, onBoard } = mount({});
    await winterIsUp();
    await waitFor(() => expect(onBoard).toHaveBeenCalled());

    view.unmount();
    // The LAST thing the city hears must be the withdrawal. Tied to the unmount rather than
    // to the exit button, because an error boundary or a route change has to clear it too.
    expect(onBoard.mock.calls[onBoard.mock.calls.length - 1]?.[0]).toBeNull();
  });
});

describe("the winter falls on the island the player can see, or on nothing", () => {
  /**
   * The count is read off the settlement STRIP, which used to be a panel reading
   * *"2 standing · 0 in ruins · none damaged"*. The negations came off it on the lead's
   * instruction to fold the block onto one line: ruins, scars and given-up ground each appear
   * only once they exist, so a settlement that has lost nothing no longer has to be read to
   * find that out. What is asserted is therefore the count that is always there, plus the
   * absence of the negation, which is the half of the change a substring match would miss.
   */
  it("reads the placements it was handed rather than the saved city", async () => {
    // jsdom has no saved city at all, so a component that reached for storage would land in
    // the refusal below. Two skills in, two standing out.
    mount({ placements: TWO_SKILLS });
    const strip = await screen.findByRole("region", { name: /The settlement/i });
    expect(strip.textContent).toMatch(/2 standing/);
    expect(strip.textContent, "nothing is in ruins, so it should not say so").not.toMatch(
      /in ruins|scarred/,
    );
    expect(screen.queryByText(/The winter has nothing to fall on/i)).toBeNull();
  });

  it("counts the hall as a placement when the island has one", async () => {
    mount({ placements: TWO_SKILLS, townHall: placed("TOWN_HALL", -1, -1) });
    const strip = await screen.findByRole("region", { name: /The settlement/i });
    expect(strip.textContent).toMatch(/3 standing/);
  });

  it("refuses an empty island instead of playing an authored layout under it", async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    const { onBoard } = mount({ placements: [], townHall: null, onExit });

    // The canvas behind is showing THIS city. Swapping in an authored board would put frost
    // beside buildings it was not falling on, which is a lie the picture tells.
    expect(await screen.findByText(/The winter has nothing to fall on/i)).toBeVisible();
    expect(screen.queryByRole("heading", { name: /^The Hard Winter$/ })).toBeNull();
    expect(onBoard).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Back to the island/i }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("keeps the 2D grid, and publishes nothing, when there is no canvas to draw on", async () => {
    // No WebGL, `enableCanvas={false}`, or a scene that failed closed. There is no island to
    // fall on, so the winter keeps the debugging board it already has rather than showing
    // controls for a picture nobody can see.
    const { onBoard } = mount({ canvasLive: false });
    expect(await screen.findByLabelText(/Map key/i)).toBeVisible();
    expect(screen.getByTestId("winter-in-city").dataset.board).toBe("grid");
    expect(onBoard).not.toHaveBeenCalled();
  });
});
