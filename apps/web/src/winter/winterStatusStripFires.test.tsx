import {
  createHardWinter,
  HARD_WINTER,
  type HardWinterState,
  hardWinterReducer,
  type WinterAction,
  type WinterFire,
  winterFireIsBurning,
  winterFireState,
} from "@cr/game";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CURRENT_ERA_ID } from "../city/eraDressing";
import { WinterStatusStrip } from "./WinterStatusStrip";

/**
 * **THE STRIP'S FIRE ROW, NOW THAT A SPENT HEARTH STAYS ON THE BOARD.**
 *
 * This row is the one place the surface counts fires, and it counted them as `fires.length > 0`.
 * That was a fair reading of *"something is holding"* while the engine deleted a fire the round
 * its fuel ran out; the ruling of 2026-08-02 keeps a spent hearth on the board, so the same
 * expression would carry the row for the rest of the winter to report that nothing is holding —
 * the most text for the least news, which is the defect the whole strip was built to remove
 * (`WinterStatusStrip.tsx`, and #328 before it).
 *
 * jsdom lays nothing out, so this is a test about WHICH FIRES COUNT and nothing about the row's
 * appearance. What the hearths look like on the island is `winterSpentHearth.browser.test.tsx`.
 */

function playRound(
  state: HardWinterState,
  action: WinterAction,
  correct: number,
): HardWinterState {
  let next = hardWinterReducer(state, { type: "declare", action });
  next = hardWinterReducer(next, {
    type: "resolve",
    correct,
    asked: HARD_WINTER.batch_size,
  });
  return hardWinterReducer(next, { type: "end_round" });
}

/** A round spent on a shield nobody earned, so only the fires under test move. */
function idleRound(state: HardWinterState): HardWinterState {
  return playRound(state, { kind: "reinforce", node_id: "NUM.S" }, 0);
}

const AT = { col: -4, row: -2 } as const;

function fireRow(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-state="fire"]');
}

function statesOn(winter: HardWinterState): string[] {
  return winter.fires.map(winterFireState).sort();
}

describe("the settlement strip counts the fires that are holding ground", () => {
  it("reports a burning fire and how long the ground it holds has left", () => {
    const winter = playRound(
      createHardWinter({ era: CURRENT_ERA_ID }),
      { kind: "fire", ...AT },
      3,
    );
    expect(statesOn(winter)).toEqual(["burning"]);

    render(<WinterStatusStrip winter={winter} />);

    const row = fireRow();
    expect(row).not.toBeNull();
    const left = (winter.fires[0] as WinterFire).rounds_left;
    expect(left).toBeGreaterThan(1);
    expect(row?.textContent).toBe(`1 fire burning · ${left} rounds left`);
  });

  /**
   * **THE ROW GOES WHEN THE LAST FIRE GOES OUT, and the hearth does not.** A settlement carrying
   * a permanent *"no fire is holding"* line is the reading this asserts against.
   */
  it("drops the row entirely once every hearth on the board is spent", () => {
    let winter = playRound(
      createHardWinter({ era: CURRENT_ERA_ID }),
      { kind: "fire", ...AT },
      3,
    );
    for (let round = 1; round < HARD_WINTER.fire.burn_rounds_by_tier.strong; round += 1) {
      winter = idleRound(winter);
    }
    // The hearth is still there — that is the ruling — and it is holding nothing.
    expect(statesOn(winter)).toEqual(["spent"]);

    render(<WinterStatusStrip winter={winter} />);

    expect(fireRow(), "the strip is reporting a fire that has burnt out").toBeNull();
    expect(screen.queryByText(/fire/)).toBeNull();
    // The rest of the strip is untouched: this is one row of it, and the settlement counts stay.
    expect(screen.getByLabelText("The settlement").textContent).toContain("standing");
  });

  /**
   * The mixed board, which is the assertion that bites if the count forgets the fuel: two hearths
   * standing, one of them spent, and the row is about the one that is holding ground.
   */
  it("counts only the burning hearth when a spent one stands beside it", () => {
    // A `steady` fire rather than a `strong` one, and it is forced by `HARD_WINTER.rounds: 3`: a
    // top-tier fire burns for three rounds, which is the whole winter, so one lit in round one is
    // still burning at the end and there would be no spent hearth for this row to ignore.
    let winter = playRound(
      createHardWinter({ era: CURRENT_ERA_ID }),
      { kind: "fire", ...AT },
      2,
    );
    for (let round = 1; round < HARD_WINTER.fire.burn_rounds_by_tier.steady; round += 1) {
      winter = idleRound(winter);
    }
    // A second fire, on its own cell, lit at full marks so its duration differs from the first
    // one's — the row quotes the SOONEST, so two equal durations would not test which was read.
    winter = playRound(winter, { kind: "fire", col: 3, row: 1 }, 3);

    expect(statesOn(winter)).toEqual(["burning", "spent"]);
    const burning = winter.fires.filter(winterFireIsBurning);
    expect(burning).toHaveLength(1);

    render(<WinterStatusStrip winter={winter} />);

    // The plural is derived from the count the row actually quotes, rather than written out: the
    // burning fire is a `strong` one here where it used to be `weak`, so the number moved with the
    // fixture and a hardcoded singular was pinning the fixture rather than the row.
    const left = (burning[0] as WinterFire).rounds_left;
    expect(fireRow()?.textContent).toBe(
      `1 fire burning · ${left} round${left === 1 ? "" : "s"} left`,
    );
  });

  /**
   * Two live fires, so the plural and the "soonest" reading are both exercised. The second is lit
   * a round later at the same tier, which is what makes the two durations differ: quoting the
   * soonest says nothing if both fires have the same amount of fuel left.
   */
  it("quotes the soonest of two burning fires to go out", () => {
    let winter = playRound(
      createHardWinter({ era: CURRENT_ERA_ID }),
      { kind: "fire", ...AT },
      3,
    );
    winter = playRound(winter, { kind: "fire", col: 3, row: 1 }, 3);

    const lives = winter.fires.filter(winterFireIsBurning).map((f) => f.rounds_left);
    expect(lives).toHaveLength(2);
    expect(new Set(lives).size, "both fires have the same duration").toBe(2);

    render(<WinterStatusStrip winter={winter} />);

    expect(fireRow()?.textContent).toBe(
      `2 fires burning · ${Math.min(...lives)} round left`,
    );
  });
});
