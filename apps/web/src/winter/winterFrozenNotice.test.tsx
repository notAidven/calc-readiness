import { HARD_WINTER } from "@cr/game";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { placementLabel } from "../city/townHall";
import { wrongButReadable } from "../test/wrongButReadable";
import { HardWinterSurface } from "./HardWinterSurface";
import { WINTER_NODE_ORDER, winterBatchFor, winterFrozenItem } from "./hardWinterItems";

/**
 * **A BUILDING FREEZING ANNOUNCES ITSELF, AND A ROUND THAT FREEZES SEVERAL SAYS HOW MANY.**
 *
 * The lead, having played it: *"there also needs to be some kind of notification/pop up when a
 * city is forzen so users know."* He means a building.
 *
 * ## THE REPRODUCTION IS FIRST, AND IT IS THE WHOLE SURFACE
 *
 * The bug-fix rule asks for a failure before a fix, and the failure here is an ABSENCE — nothing
 * said a building had gone. An absence is the one thing a fixture can fake, so this drives the
 * real surface through real rounds with the real answer checker, exactly as
 * `HardWinterSurface.test.tsx` does, and asserts in order: nothing announced before anything is
 * lost, then a loss on the board, then the words about it. Run against the tree before the notice
 * existed, the second of those passes and the third fails, which is the shape a reproduction owes.
 *
 * ## SEVERAL AT ONCE IS THE ORDINARY CASE
 *
 * `damage.ruin_at` is 1 and the frost crosses the island in three rounds, so one thrown-away round
 * reaches a whole band of the settlement and every unwarded, unshielded building in it goes
 * together. A notice written for the singular would be wrong on the common board, so the plural is
 * asserted on a board that PRODUCES it rather than on one that stipulates it — and the count that
 * board produces is read off the screen rather than written down here.
 *
 * jsdom lays nothing out, so this is about what is SAID. The frame is in
 * `docs/design-refs/hard-winter-crisis-qa/`.
 */

const allPractised = (): readonly string[] => WINTER_NODE_ORDER;

/** The answer keys of the batch the surface will draw for a round of encounter one. */
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

/** Answer the round's whole batch WRONG, through the real checker. */
async function throwTheBatch(
  user: ReturnType<typeof userEvent.setup>,
  round: number,
): Promise<void> {
  const keys = answerKeysFor(round);
  for (const [index, key] of keys.entries()) {
    const field = await screen.findByRole("textbox");
    await user.clear(field);
    await user.type(field, wrongButReadable(key));
    await user.click(screen.getByRole("button", { name: "Check" }));
    await user.click(
      screen.getByRole("button", {
        name: index + 1 >= keys.length ? /See what you earned/i : /Next question/i,
      }),
    );
  }
}

/**
 * One round thrown away: a fire declared in a corner and every answer wrong, so the tier is
 * `none`, the fire holds no ground and the frost does all the work. `HardWinterSurface.test.tsx`'s
 * own `playFireRound` at zero, which is the established way to drive this board to a loss.
 */
async function throwARound(
  user: ReturnType<typeof userEvent.setup>,
  round: number,
): Promise<void> {
  await user.click(screen.getByRole("button", { name: /Light a fire/i }));
  const at = document.querySelector<HTMLElement>('[data-cell="-2,-2"]');
  if (!at) {
    throw new Error("no cell -2,-2 on the grid");
  }
  await user.click(at);
  await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));
  await throwTheBatch(user, round);
  await user.click(screen.getByRole("button", { name: /Let the frost advance/i }));
}

function notice(): HTMLElement | null {
  return screen.queryByTestId("hw-frozen-notice");
}

/** Buildings the board reports as lost, read off the settlement strip's own roll. */
function ruinsOnScreen(): number {
  return document.querySelectorAll(".hw-grid .hw-cell--ruin").length;
}

describe("a building freezing says so", () => {
  it("says nothing before the frost has taken anything", () => {
    render(<HardWinterSurface readMasteredNodes={allPractised} />);
    expect(screen.getByText(new RegExp(`Round 1 of ${HARD_WINTER.rounds}`))).toBeVisible();
    expect(notice(), "a loss is announced before anything is lost").toBeNull();
  });

  it("names the buildings the round took, and counts them when there are several", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    /*
     * Every round, throwing all three questions, and what the screen said after each. The round
     * that loses SEVERAL is found rather than assumed: at this tuning the first loss is one
     * building and a later round takes a whole band, so a test that stopped at the first loss
     * would leave the plural — the case the ask is really about — untested.
     */
    const rounds: { readonly text: string; readonly ruins: number }[] = [];
    for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
      await throwARound(user, round);
      rounds.push({ text: notice()?.textContent ?? "", ruins: ruinsOnScreen() });
    }

    // THE LOSS IS REAL, asserted before the words about it, so a notice that fired on nothing
    // cannot pass this.
    const finalRuins = rounds[rounds.length - 1]?.ruins ?? 0;
    expect(finalRuins, "no building was lost in a thrown-away winter").toBeGreaterThan(0);
    expect(
      rounds.filter((r) => r.text !== "").length,
      "buildings were lost and no round announced it",
    ).toBeGreaterThan(0);

    // Each announcement's count is read off the BOARD's own change over that round, so this
    // stays true if the tuning changes how many a round takes.
    let plurals = 0;
    for (const [index, entry] of rounds.entries()) {
      const before = index === 0 ? 0 : (rounds[index - 1]?.ruins ?? 0);
      const took = entry.ruins - before;
      if (took === 0) {
        expect(entry.text, `round ${index + 1} lost nothing and announced something`).toBe(
          "",
        );
        continue;
      }
      expect(entry.text, `round ${index + 1} lost ${took} and announced nothing`).not.toBe(
        "",
      );
      expect(entry.text).toContain(
        took === 1 ? "A building has frozen" : `${took} buildings have frozen`,
      );
      // Every one of them is NAMED, through the roster's own labels rather than node ids.
      const named = WINTER_NODE_ORDER.filter((nodeId) =>
        entry.text.includes(placementLabel(nodeId)),
      );
      expect(
        named.length,
        `round ${index + 1} took ${took} buildings and the notice names ${named.length}`,
      ).toBe(took);
      if (took > 1) {
        plurals += 1;
      }
    }
    // ...and this tuning does take several in one round, which is the case the plural exists for.
    // If it ever stops, this fails and the plural has to be justified some other way.
    expect(
      plurals,
      `no round took more than one building (${rounds.map((r) => r.ruins).join("/")} in ruins)`,
    ).toBeGreaterThan(0);
    // An interruption rather than a passing remark: this is the encounter's only irreversible
    // harm, and the spent-shield line beside it is deliberately the quieter `status`.
    const last = notice();
    expect(last?.getAttribute("role")).toBe("alert");
  }, 60000);
});
