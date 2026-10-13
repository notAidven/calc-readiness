import { HARD_WINTER } from "@cr/game";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { audioPrefs } from "../audio/audioPrefs";
import { installSfxProbe } from "../audio/testSfxProbe";
import { installCountingAudio } from "../lessons/testHarness";
import { wrongButReadable } from "../test/wrongButReadable";
import { HardWinterSurface } from "./HardWinterSurface";
import { WINTER_NODE_ORDER, winterBatchFor, winterFrozenItem } from "./hardWinterItems";

/**
 * **WHAT THE HARD WINTER SOUNDS, AND WHEN, AND NOT WHILE MUTED.**
 *
 * The whole encounter is driven for real: the batch draw is seeded on `(encounter, round)`,
 * so this file can look up the three questions the surface will ask and type their real
 * answer keys in, which is what makes an accuracy-driven mechanic testable at all.
 * `HardWinterSurface.test.tsx` owns that harness and this borrows its shape.
 *
 * Nothing mocks `playSfx`. `installSfxProbe` swaps the `Audio` constructor underneath the
 * app-wide player and leaves `audioPrefs`, the autoplay gate and every retrigger floor in
 * the path, so "not while muted" is a statement about the shipped machinery rather than
 * about a spy. The round's VERDICT is a synthesized chime rather than a sample, so the
 * oscillator counter from `lessons/testHarness.ts` observes that one.
 *
 * ## The stacking claim is the reason this file is worth its runtime
 *
 * A round can freeze several buildings at once, and the naive wiring plays one crack per
 * building. The assertion that a whole round produces exactly ONE crack cannot be made
 * anywhere but here: it needs a real board, a real frost advance and a real settlement for
 * the frost to reach.
 */

const FIRST_ENCOUNTER = 1;

const allPractised = (): readonly string[] => WINTER_NODE_ORDER;

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

function cell(coords: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-cell="${coords}"]`);
  if (!found) {
    throw new Error(`no cell ${coords} on the grid`);
  }
  return found;
}

type User = ReturnType<typeof userEvent.setup>;

/** Answer the round's batch with `correct` of them right, through the REAL checker. */
async function answerBatch(user: User, round: number, correct: number): Promise<void> {
  const keys = answerKeysFor(round);
  for (const [index, key] of keys.entries()) {
    const field = await screen.findByRole("textbox");
    await user.clear(field);
    await user.type(field, index < correct ? key : wrongButReadable(key));
    await user.click(screen.getByRole("button", { name: "Check" }));
    await user.click(
      screen.getByRole("button", {
        name: index + 1 >= keys.length ? /See what you earned/i : /Next question/i,
      }),
    );
  }
}

async function declareFire(user: User, coords: string): Promise<void> {
  await user.click(screen.getByRole("button", { name: /Light a fire/i }));
  await user.click(cell(coords));
  await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));
}

/**
 * Ruined buildings ON THE BOARD. Scoped to `.hw-grid` because the key beside the island
 * reuses the same state class for its swatch, which is what keeps the key's colours
 * honest and what makes an unscoped count off by one.
 */
function ruinsOnTheBoard(): number {
  return document.querySelectorAll(".hw-grid .hw-cell--ruin").length;
}

async function closeRound(user: User): Promise<void> {
  await user.click(screen.getByRole("button", { name: /Let the frost advance/i }));
}

const probe = installSfxProbe();

afterAll(() => probe.restore());

beforeEach(() => {
  probe.reset();
});

describe("committing a crisis action", () => {
  it("thuds once, on the commit, and not on arming or on picking a cell", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);
    probe.reset();

    await user.click(screen.getByRole("button", { name: /Light a fire/i }));
    await user.click(cell("-2,-2"));
    // Choosing is not committing. The declaration can still be changed here, and a sound
    // that had already fired would have announced a decision the player has not made.
    expect(probe.played()).toEqual([]);

    await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));

    // Era one builds in timber, so this is the ladder's early rung.
    expect(probe.played()).toEqual(["crisis-commit.ogg"]);
  }, 120000);

  it("stays silent while muted", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);
    probe.reset();
    audioPrefs.setMuted(true);

    await declareFire(user, "-2,-2");

    expect(probe.played()).toEqual([]);
  }, 120000);
});

describe("a round returning its verdict", () => {
  it("chimes when the round earned something, and lights the fire it bought", async () => {
    const user = userEvent.setup();
    const audio = installCountingAudio();
    try {
      render(<HardWinterSurface readMasteredNodes={allPractised} />);
      probe.reset();
      await declareFire(user, "-2,-2");
      audio.reset();

      await answerBatch(user, 1, 3);

      // The chime is the one sound here that was already in the tree, so nothing was
      // sourced for it: a per-tier fanfare would make a graded outcome loud.
      expect(audio.oscillators()).toBeGreaterThan(0);
      // And a hearth that CAUGHT is its own event, separate from the commit that declared it.
      expect(probe.countOf("fire-lit.ogg")).toBe(1);
    } finally {
      audio.restore();
    }
  }, 120000);

  it("is silent on a round that bought nothing, in both channels", async () => {
    const user = userEvent.setup();
    const audio = installCountingAudio();
    try {
      render(<HardWinterSurface readMasteredNodes={allPractised} />);
      probe.reset();
      await declareFire(user, "-2,-2");
      audio.reset();

      // Nought of three: tier `none`, so the fire never catches and the round earned no
      // check mark. A chime over that would be a lie rather than a low celebration.
      await answerBatch(user, 1, 0);

      expect(audio.oscillators()).toBe(0);
      expect(probe.countOf("fire-lit.ogg")).toBe(0);
    } finally {
      audio.restore();
    }
  }, 120000);

  it("keeps the fire silent while muted", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);
    await declareFire(user, "-2,-2");
    // After the commit, so its own thud is not what this reads. `reset` un-mutes, which
    // is why the mute is set second.
    probe.reset();
    audioPrefs.setMuted(true);

    await answerBatch(user, 1, 3);

    expect(probe.played()).toEqual([]);
  }, 120000);
});

describe("a round closing", () => {
  it("sounds the frost taking ground, once, on the press that advances it", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);
    await declareFire(user, "-2,-2");
    await answerBatch(user, 1, 0);
    probe.reset();

    // Answering did not advance the frost, so nothing has frozen yet.
    expect(probe.countOf("frost-advance.ogg")).toBe(0);

    await closeRound(user);

    expect(probe.countOf("frost-advance.ogg")).toBe(1);
  }, 120000);

  it("stays silent while muted", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);
    await declareFire(user, "-2,-2");
    await answerBatch(user, 1, 0);
    probe.reset();
    audioPrefs.setMuted(true);

    await closeRound(user);

    expect(probe.played()).toEqual([]);
  }, 120000);

  /**
   * **THE STACKING ASSERTION.**
   *
   * Played at nought of three every round, so nothing is warded and the frost runs the
   * board. By the last round it is reaching the settlement, and it reaches more than one
   * building on the same advance — which is exactly the press that a one-crack-per-building
   * wiring turns into a pile of overlapping samples.
   *
   * The floor under it is the point: the assertion is not merely "at most one crack", which
   * a silent build would also satisfy. It is that the frost really did get more than one
   * building AND that the round still produced one crack.
   */
  it("cracks ONCE however many buildings the frost reached in the round", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    let roundsWithACrack = 0;
    let ruinedTotal = 0;
    let mostInOneRound = 0;

    for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
      await declareFire(user, "-2,-2");
      await answerBatch(user, round, 0);
      const before = ruinsOnTheBoard();
      probe.reset();
      await closeRound(user);

      const struck = ruinsOnTheBoard() - before;
      ruinedTotal += struck;
      mostInOneRound = Math.max(mostInOneRound, struck);
      if (struck > 0) {
        roundsWithACrack += 1;
        // ONE crack for the round, whatever the frost found.
        expect(
          probe.countOf("building-frozen.ogg"),
          `round ${round} struck ${struck} buildings`,
        ).toBe(1);
      } else {
        expect(probe.countOf("building-frozen.ogg"), `round ${round} struck nobody`).toBe(
          0,
        );
      }
    }

    // The floors. Without them "at most one crack" is satisfied by a winter in which the
    // frost never reached anybody and by a build that plays nothing at all.
    expect(ruinedTotal, "the frost never reached the settlement").toBeGreaterThan(0);
    expect(roundsWithACrack, "no round ever cracked").toBeGreaterThan(0);
    expect(
      mostInOneRound,
      "no single round ever struck more than one building, so the stacking case never arose",
    ).toBeGreaterThan(1);
  }, 180000);

  it("drips once when the winter lets go, on the press that ends it", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    for (let round = 1; round < HARD_WINTER.rounds; round += 1) {
      await declareFire(user, "-2,-2");
      await answerBatch(user, round, 0);
      probe.reset();
      await closeRound(user);
      // Every round before the last closes without a thaw: the winter has not let go.
      expect(probe.countOf("thaw.ogg"), `round ${round}`).toBe(0);
    }

    await declareFire(user, "-2,-2");
    await answerBatch(user, HARD_WINTER.rounds, 0);
    probe.reset();
    await closeRound(user);

    expect(screen.getByTestId("hw-conclusion")).toBeVisible();
    expect(probe.countOf("thaw.ogg")).toBe(1);
  }, 180000);
});
