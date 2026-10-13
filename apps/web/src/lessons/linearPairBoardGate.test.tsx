/**
 * LF.2's line-pair board opens its gate on every pair being CALLED (R29).
 *
 * The board is the only D7 surface that holds four independently-answerable calls, and it
 * shipped with `onComplete` fired from inside `Object.values(next).every(Boolean)`: a learner
 * who misread one pair, was told what that pair actually does, and then ruled the other three
 * correctly could not reach the advisor's Next button without re-ruling the three they had
 * already had right. R29's trap list names that shape by its predicate.
 *
 * Both paths are measured, because a gate that fired on ANY fourth call would pass a
 * missed-board test alone and a gate that never fired would pass a clean-board test alone:
 *
 *  - a board with one miss and three right opens the gate exactly once, and the miss stays
 *    on its chip afterwards, which is the other half of R29;
 *  - a clean board still opens it exactly once, and gets the conclusion rather than the
 *    carry-on line;
 *  - a board with a pair still unruled has NOT opened it, so "called" is doing the work
 *    rather than "four clicks happened".
 *
 * The set-level line after a completed board with a miss is asserted too (R33): it may not
 * open on what the miss cost, and the rejected wording is quoted here so it cannot come back
 * under a new author.
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LinearLinePairClassify } from "./interactive/LinearLinePairClassify";

/** Every pair on the board, with the call that is right and one that is wrong. */
const BOARD = [
  { label: "Pair 1", right: "parallel", wrong: "perpendicular" },
  { label: "Pair 2", right: "neither", wrong: "parallel" },
  { label: "Pair 3", right: "perpendicular", wrong: "parallel" },
  { label: "Pair 4", right: "perpendicular", wrong: "parallel" },
] as const;

/** The wording R33 rejected, quoted so a rewrite cannot reintroduce it. */
const PENALTY_FIRST = "A clean board is every call right";

function boardUnderTest() {
  const onComplete = vi.fn();
  const { container, unmount } = render(<LinearLinePairClassify onComplete={onComplete} />);

  const click = (label: string) => {
    const button = container.querySelector(`button[aria-label^="${label}"]`);
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error(`no control whose accessible name starts "${label}"`);
    }
    fireEvent.click(button);
  };

  /** Tap the chip that plots a pair, then rule on it. */
  const rule = (index: number, call: "right" | "wrong") => {
    const pair = BOARD[index];
    if (!pair) {
      throw new Error(`no pair ${index} on this board`);
    }
    click(chipLabel(container, index));
    click(`${pair.label} is ${pair[call]}`);
  };

  const status = () =>
    container.querySelector(".lesson-interactive__status")?.textContent ?? "";

  const chipState = (index: number) => {
    const pair = BOARD[index];
    const chip = [...container.querySelectorAll("button")].find((button) =>
      (button.textContent ?? "").startsWith(pair?.label ?? "?"),
    );
    return chip?.getAttribute("data-state") ?? null;
  };

  return { onComplete, rule, status, chipState, unmount };
}

/** The chip for a pair, found by its visible label rather than by its spoken equations. */
function chipLabel(container: HTMLElement, index: number): string {
  const pair = BOARD[index];
  const chip = [...container.querySelectorAll("button")].find((button) =>
    (button.textContent ?? "").startsWith(pair?.label ?? "?"),
  );
  const label = chip?.getAttribute("aria-label");
  if (!label) {
    throw new Error(`no chip for ${pair?.label}`);
  }
  return label;
}

describe("LF.2 line-pair board: a recorded miss does not hold a finished board shut", () => {
  it("opens the gate once when all four are called, with one of them missed", () => {
    const board = boardUnderTest();
    try {
      board.rule(0, "wrong");
      expect(board.onComplete, "one call is not a finished board").not.toHaveBeenCalled();
      board.rule(1, "right");
      board.rule(2, "right");
      expect(
        board.onComplete,
        "three of four called is not a finished board",
      ).not.toHaveBeenCalled();
      board.rule(3, "right");
      expect(board.onComplete).toHaveBeenCalledTimes(1);
      // The other half of R29: the miss is still on the board it did not close.
      expect(board.chipState(0)).toBe("wrong");
    } finally {
      board.unmount();
    }
  });

  it("still opens the gate once on a clean board, and concludes rather than consoles", () => {
    const board = boardUnderTest();
    try {
      for (let index = 0; index < BOARD.length; index += 1) {
        board.rule(index, "right");
      }
      expect(board.onComplete).toHaveBeenCalledTimes(1);
      expect(board.status()).toContain("All four ruled");
      expect(board.chipState(0)).toBe("solved");
    } finally {
      board.unmount();
    }
  });

  it("holds the gate shut while any pair is still unruled", () => {
    const board = boardUnderTest();
    try {
      board.rule(0, "right");
      board.rule(1, "wrong");
      board.rule(2, "right");
      expect(board.onComplete).not.toHaveBeenCalled();
    } finally {
      board.unmount();
    }
  });

  it("does not open the set-level line on what the miss cost (R33)", () => {
    const board = boardUnderTest();
    try {
      board.rule(0, "wrong");
      board.rule(1, "right");
      board.rule(2, "right");
      board.rule(3, "right");
      const line = board.status();
      expect(line).not.toContain(PENALTY_FIRST);
      // A floor under the negative: an empty status line would satisfy it trivially.
      expect(line.length).toBeGreaterThan(40);
      expect(line).toContain("you're good to move on");
    } finally {
      board.unmount();
    }
  });
});
