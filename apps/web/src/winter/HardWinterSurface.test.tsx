import { HARD_WINTER, winterDamageBite } from "@cr/game";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CURRENT_ERA_ID } from "../city/eraDressing";
import { placementLabel } from "../city/townHall";
import { materialWord } from "../economy/materialWord";
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
 * The Hard Winter surface, played.
 *
 * The batch draw is SEEDED on `(encounter, round)`, so this suite can look up the exact
 * three questions the surface will ask on a given round and type their real answer keys
 * in. That is the property that makes an accuracy-driven mechanic testable at all: without
 * it there would be no way to drive a round to a chosen tier and the whole
 * declare-then-earn path would be untestable end to end.
 *
 * jsdom lays nothing out, so what is checked here is BEHAVIOUR: that the round loop
 * advances only on clicks, that the declaration is locked before the questions, that
 * accuracy changes the magnitude, and that a ruin keeps its lesson. The rendered
 * appearance — the frost line, the warm patch, the 88-cell island — is checked in real
 * Chromium in `hardWinter.browser.test.tsx`, because a class name is not a picture.
 */

const FIRST_ENCOUNTER = 1;

/** The answer keys of the batch the surface will draw for a round of encounter one. */
function answerKeysFor(round: number, masteredCount = WINTER_NODE_ORDER.length): string[] {
  const batch = winterBatchFor({
    masteredNodeIds: WINTER_NODE_ORDER.slice(0, masteredCount),
    encounter: FIRST_ENCOUNTER,
    round,
  });
  if (batch.status !== "ready") {
    throw new Error(`no batch for round ${round}: ${batch.message}`);
  }
  return batch.prompts.map((prompt) => {
    const frozen = winterFrozenItem(prompt.item_version_id);
    const key = frozen?.answer.answer_key;
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

/**
 * Cells on the BOARD matching a state class. Scoped to `.hw-grid` because the map key
 * deliberately reuses the same state classes for its swatches — that is what keeps the
 * key's colours honest — so an unscoped count is off by one per legend entry. (This test
 * found that by measuring 26 warded cells for a 5x5 fire.)
 */
function boardCells(stateClass: string): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>(`.hw-grid .${stateClass}`);
}

/**
 * The settlement read-out, reached by its ACCESSIBLE NAME rather than by a test id.
 *
 * It used to be a `.hw-panel` with an `<h2>The settlement</h2>`, which is what these tests
 * found it by. It is now a status strip that carries the same counts on one row beside the
 * island's key, on the lead's instruction, and a heading over a single line of status would be
 * the vertical space the strip exists to give back. So the name moved to `aria-label` — a
 * `<section>` with one is a `region` — and finding it this way keeps a real claim in these
 * tests: whatever shape it takes, the block a screen-reader user reaches for has a name.
 */
function settlementStrip(): HTMLElement {
  return screen.getByRole("region", { name: /The settlement/i });
}

/** The concluding screen, which is outside the shell and is not a `.hw-panel`. */
function conclusion(): HTMLElement {
  return screen.getByTestId("hw-conclusion");
}

/**
 * Answer the round's batch with `correct` of them right. A wrong answer is the real key
 * with a marker appended, so it fails through the REAL checker rather than through a
 * short-circuit this test invented.
 */
async function answerBatch(
  user: ReturnType<typeof userEvent.setup>,
  round: number,
  correct: number,
): Promise<void> {
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

/** Declare a fire at `coords`, answer `correct` of three, and let the frost advance. */
async function playFireRound(
  user: ReturnType<typeof userEvent.setup>,
  round: number,
  coords: string,
  correct: number,
): Promise<void> {
  await user.click(screen.getByRole("button", { name: /Light a fire/i }));
  await user.click(cell(coords));
  await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));
  await answerBatch(user, round, correct);
  await user.click(screen.getByRole("button", { name: /Let the frost advance/i }));
}

describe("the Hard Winter surface", () => {
  it("opens on round one with the island, the six buildings and the no-mastery note", () => {
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    expect(screen.getByRole("heading", { name: "The Hard Winter" })).toBeVisible();
    expect(screen.getByText(new RegExp(`Round 1 of ${HARD_WINTER.rounds}`))).toBeVisible();

    // The island is era one's, cell for cell.
    expect(document.querySelectorAll("[data-cell]")).toHaveLength(100);
    expect(boardCells("hw-cell--water")).toHaveLength(12);

    // All six buildings are on the board and reachable as controls.
    for (const nodeId of WINTER_NODE_ORDER) {
      expect(
        document.querySelector(`[data-node="${nodeId}"]`),
        `${nodeId} is not on the grid`,
      ).not.toBeNull();
    }
    expect(WINTER_NODE_ORDER).toHaveLength(6);

    // The ruling, on screen where a player can read it.
    expect(screen.getByText(/not written to mastery/i)).toBeVisible();
  });

  it("will not let a round be committed before something is declared", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    const commit = screen.getByRole("button", { name: /Commit and face 3 questions/i });
    expect(commit).toBeDisabled();
    expect(screen.getByText("Nothing declared yet.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Light a fire/i }));
    // Still nothing declared: a fire needs a place.
    expect(
      screen.getByRole("button", { name: /Commit and face 3 questions/i }),
    ).toBeDisabled();

    await user.click(cell("-2,-2"));
    expect(screen.getByText("Light a fire at column -2, row -2")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Commit and face 3 questions/i }),
    ).toBeEnabled();
  });

  /**
   * The ordering that is the whole design: once the batch starts, the declaration is
   * pinned in front of the learner and there is no way back to the action picker.
   */
  it("locks the declaration behind the questions", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    await user.click(screen.getByRole("button", { name: /Light a fire/i }));
    await user.click(cell("-2,-2"));
    await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));

    expect(screen.getByText(/Question 1 of 3/)).toBeVisible();
    expect(screen.getByText(/Light a fire at column -2, row -2/)).toBeVisible();
    // No route back: the action picker and the commit button are both gone.
    expect(screen.queryByRole("button", { name: /Light a fire/i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Commit and face 3 questions/i }),
    ).toBeNull();
  });

  it("plays a whole round: declare, three real questions, resolve, frost advances", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    /*
      THE FROST IS READ OFF THE BOARD, and it used to be read off a running tally in the
      masthead. *"N of M cells frozen"* is gone on the lead's own diagnosis — *"theres' too
      much like bookeeping on '88 tiles ___'"* — so the claim is made against the thing the
      player actually looks at, which is also the stronger instrument: a tally can be right
      over a board that draws nothing.
    */
    expect(boardCells("hw-cell--frozen")).toHaveLength(0);

    await playFireRound(user, 1, "-2,-2", 3);

    expect(screen.getByText(new RegExp(`Round 2 of ${HARD_WINTER.rounds}`))).toBeVisible();
    // The frost moved, and the round log says what happened.
    expect(boardCells("hw-cell--frozen").length).toBeGreaterThan(0);
    const log = screen.getByRole("heading", { name: "What happened" }).closest("section");
    expect(log?.textContent).toContain("Round 1.");
    // The score, in the ladder's own units. The tier's enum name ("strong") used to close
    // the line in brackets and is gone: it is the engine's vocabulary, and it told the
    // player nothing the score had not already.
    expect(log?.textContent).toContain("You got 3 of 3 right.");
    expect(log?.textContent).not.toContain("strong");
  });

  /**
   * Accuracy is magnitude, not permission. Both plays declare the same fire in the same
   * place; only the number of correct answers differs, and the fire that comes out is a
   * different size. The zero-accuracy fire is still LIT — the declaration was honoured —
   * it simply never catches.
   *
   * The 13 is the retune, on screen: the top tier used to warm 25 cells of an 88-cell
   * island and now warms 13. `(0, -2)` is deep enough that the disc is entirely on land,
   * so the board's count is the tuning table's own figure with nothing clipped.
   */
  it("sizes the declared action by accuracy, and honours it even at zero", async () => {
    const user = userEvent.setup();
    const perfect = render(<HardWinterSurface readMasteredNodes={allPractised} />);
    await user.click(screen.getByRole("button", { name: /Light a fire/i }));
    await user.click(cell("0,-2"));
    await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));
    await answerBatch(user, 1, 3);

    expect(screen.getByText(/It holds 13 cells/)).toBeVisible();
    const wide = boardCells("hw-cell--warded").length;
    expect(wide).toBe(13);
    perfect.unmount();

    render(<HardWinterSurface readMasteredNodes={allPractised} />);
    await user.click(screen.getByRole("button", { name: /Light a fire/i }));
    await user.click(cell("0,-2"));
    await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));
    await answerBatch(user, 1, 0);

    expect(screen.getByText(/never catches/)).toBeVisible();
    expect(boardCells("hw-cell--warded")).toHaveLength(0);
    // Lit all the same: the round's log records the action, not a refusal.
    expect(screen.getByText(/Light a fire at column 0, row -2\./)).toBeVisible();
  });

  it("grades through the real checker: a wrong answer is marked wrong", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    await user.click(screen.getByRole("button", { name: /Light a fire/i }));
    await user.click(cell("-2,-2"));
    await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));

    const key = answerKeysFor(1)[0] as string;
    const field = await screen.findByRole("textbox");
    await user.type(field, wrongButReadable(key));
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByText("Not right.")).toBeVisible();

    /*
      AND THE ROUND MOVES ON WITHOUT A RUNNING TALLY UNDER IT. *"0 of 1 right so far. 2 still
      to come."* used to be asserted here and is cut: it is a tracker of answers taken, which
      is what the lead asked to be removed, and the heading two lines above already says which
      question this is. What the round owes after a verdict is that it ADVANCES, which is what
      is checked instead; `stripsTheQuestionSurface` below is where the absence is asserted.
    */
    await user.click(screen.getByRole("button", { name: /Next question/i }));
    expect(screen.getByRole("heading", { name: "Question 2 of 3" })).toBeVisible();
    expect(screen.queryByText(/right so far/)).toBeNull();
  });

  /**
   * FEEDBACK ON BOTH VERDICTS. The rendered shape of the solution and the accessible names
   * around it are measured in `crisisSolutionFeedback.browser.test.tsx`, which is where a
   * cascade and a layout exist; this is the compact both-states check, so the default suite
   * catches a reveal that gets gated on `!correct` without waiting for the browser run.
   *
   * The two halves are asserted in one test on purpose: what has to hold is that the answer
   * to the SAME question appears either way, and driving one question twice is the only way
   * to say that without two items' answer keys entering the comparison.
   */
  it("shows the solution after a wrong answer and after a right one", async () => {
    const user = userEvent.setup();
    const key = answerKeysFor(1)[0] as string;

    for (const right of [false, true]) {
      const view = render(<HardWinterSurface readMasteredNodes={allPractised} />);
      await user.click(screen.getByRole("button", { name: /Light a fire/i }));
      await user.click(cell("-2,-2"));
      await user.click(
        screen.getByRole("button", { name: /Commit and face 3 questions/i }),
      );

      const field = await screen.findByRole("textbox");
      await user.clear(field);
      await user.type(field, right ? key : wrongButReadable(key));
      await user.click(screen.getByRole("button", { name: "Check" }));

      const where = right ? "after a right answer" : "after a wrong answer";
      expect(document.querySelector(".hw-verdict")?.getAttribute("data-status")).toBe(
        right ? "correct" : "incorrect",
      );
      expect(document.querySelector(".hw-solution"), `no solution ${where}`).not.toBeNull();
      expect(
        document.querySelector(".hw-solution .worked-solution"),
        `the shared WorkedSolution did not render ${where}`,
      ).not.toBeNull();
      expect(
        document.querySelector(".hw-solution__answer")?.textContent,
        `the answer is not stated ${where}`,
      ).toContain("The answer was");

      // Feedback, not a second chance: nothing can be resubmitted.
      expect((await screen.findByRole("textbox")).hasAttribute("disabled")).toBe(true);
      expect(screen.queryByRole("button", { name: "Check" })).toBeNull();

      view.unmount();
    }
  });

  /**
   * "Click a building to review its lesson" still holds for a RUIN, which is one of the
   * three reasons the design keeps ruins as a state rather than a deletion: a learner who
   * plays the encounter badly must not lose access to teaching.
   */
  it("keeps a ruined building clickable, with its lesson still behind it", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    // ONE zero-accuracy round takes the shoreline Lookout. This used to take three: two
    // early bites of two points each with the third going over the six a building absorbed.
    // At `HARD_WINTER.damage.ruin_at: 2` the first bite is the whole building.
    await playFireRound(user, 1, "-2,-2", 0);

    const lookout = document.querySelector<HTMLElement>('[data-node="NUM.5"]');
    if (!lookout) {
      throw new Error("the Lookout has been deleted from the grid");
    }
    expect(lookout.className).toContain("hw-cell--ruin");
    expect(lookout.tagName).toBe("BUTTON");

    await user.click(lookout);
    const panel = document.querySelector(".hw-panel--inspect");
    expect(panel?.textContent).toContain("a ruin since round 1");
    expect(panel?.textContent).toContain("Its lesson is still here");
    expect(panel?.textContent).toContain("rebuildable for");
  });

  /**
   * A DAMAGED BUILDING IS THE THIRD APPEARANCE, and it owes everything a ruin owes: it
   * stays on its cell, stays a button, and stays clickable to its lesson. It is the state
   * the old model could not draw, so this is the test that would have had nothing to
   * assert.
   *
   * ## ⚑ RE-FIXTURED AGAIN 2026-08-02, AND THE STATE IT DREW NO LONGER EXISTS
   *
   * It played one zero-accuracy round and read the Lookout as MARKED. At `ruin_at: 2` that round
   * destroyed it, and the only standing damage the engine could produce anywhere was a two-point
   * `weak` shield meeting a three-point bite, so the fixture grew to four rounds: a top-tier fire
   * held the Lookout for the three rounds it burned, two were thrown away, and round four bought
   * the weak shield against the first deep bite.
   *
   * **At `ruin_at: 1` there is no such state on any board at any accuracy** — proved over the whole
   * shield-by-bite space in `hard-winter.test.ts`'s *"a building is sound or it is a ruin"* — so
   * what the board draws instead is the RUIN, and what this test owes is the half of the original
   * claim that survives: **it keeps its cell, it keeps its glyph, it stays a button, and the lesson
   * behind it is exactly as reachable as an unmarked building's.** That was always the load-bearing
   * half; the rime was the picture.
   *
   * The rime's own vocabulary is asserted as an ABSENCE here rather than deleted, because
   * `HARD_WINTER.damage.stages` is deliberately left at 3 and its CSS rules are deliberately left in
   * place: a `ruin_at` with room in it puts the climbing frost back, and this is where a board that
   * started drawing it again without one would fail.
   */
  it("keeps a building the frost destroyed on the board, and its lesson reachable", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    // One round. The Lookout stands on the shoreline, `spread.base` is 1 so round one's frost is
    // exactly that band, and at `ruin_at: 1` an unsheltered cold round is the whole building.
    await playFireRound(user, 1, "-2,-2", 0);
    expect(screen.getByText(new RegExp(`Round 2 of ${HARD_WINTER.rounds}`))).toBeVisible();

    const lookout = document.querySelector<HTMLElement>('[data-node="NUM.5"]');
    if (!lookout) {
      throw new Error("the Lookout is not on the grid");
    }
    expect(lookout.className).toContain("hw-cell--ruin");
    expect(lookout.tagName).toBe("BUTTON");
    // NOT HUE ALONE: a ruin wears the cross as well as the tone.
    expect(lookout.querySelector(".hw-cell__mark")?.textContent).toBe("\u2715");
    expect(lookout.getAttribute("aria-label")).toContain("a ruin since round 1");

    // AND NO RIME, at any stage. The vocabulary is still in `hard-winter.css` and
    // `HARD_WINTER.damage.stages` is still 3, deliberately, so this is where a board that started
    // drawing a scar again would fail rather than passing quietly over an unreachable state.
    expect(lookout.className).not.toContain("hw-cell--hurt");
    expect(lookout.querySelector(".hw-cell__hurt")).toBeNull();
    expect(lookout.getAttribute("aria-label")).not.toContain("Frost has climbed");

    // And the lesson behind it is reachable, which is the ruling this test exists for: a ruin is a
    // state on something still there, never a removal.
    await user.click(lookout);
    const panel = document.querySelector(".hw-panel--inspect");
    expect(panel?.textContent).toContain("a ruin since round 1");
    expect(panel?.textContent).toContain("Its lesson is still here");
    // The settlement strip carries the running bill, so the loss is not only a picture. It reads
    // "1 in ruins" where it read "1 scarred" and a mend price: there is no scar to mend.
    const status = settlementStrip();
    expect(status.textContent).toContain("1 in ruins");
    expect(status.textContent).not.toContain("scarred");
  }, 60000);

  /**
   * **THERE IS NO MEND ACTION, and the board says so in both directions.**
   *
   * This test used to be the mend card's own: refused while nothing was hurt, and once
   * something was, it undid the damage. The lead ruled the action out on 2026-07-31, and what
   * replaces it is the pair of claims that removal actually owes.
   *
   * The population is read off the RENDERED surface rather than written down, and it is
   * asserted as a set equality so it fails whichever way the board and this list come apart:
   * an action added without a line here fails, and the mend card reappearing fails. A
   * "does not contain mend" assertion on its own would have passed over a board with no
   * actions at all.
   *
   * THE SECOND STATE IS A RUIN RATHER THAN A SCAR SINCE 2026-08-01, and that is a re-fixturing
   * rather than a weaker claim: at `HARD_WINTER.damage.ruin_at: 2` a zero-accuracy round took the
   * shoreline building outright, and the earliest a SCAR could exist was after the last round
   * closed, by which point the action rail was gone with the declaring phase. At `ruin_at: 1`
   * there is no scarred state at all, so a ruin is the only second state there is.
   */
  it("offers two actions and no way to mend, before and after the frost takes something", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    const offered = () =>
      Array.from(document.querySelectorAll<HTMLElement>(".hw-actions .hw-action")).map(
        (card) => card.childNodes[0]?.textContent?.trim(),
      );

    // TWO, and the third came out with the give-up-ground action on 2026-08-02. A set equality
    // rather than a "does not contain" is what makes that removal visible here: it has now caught
    // one action arriving (the mend, in reverse) and one leaving.
    expect(offered()).toEqual(["Light a fire", "Reinforce a building"]);

    // Once something IS harmed, which is the state the mend card used to appear for.
    await playFireRound(user, 1, "-2,-2", 0);
    const status = settlementStrip();
    expect(
      status.textContent,
      "nothing is harmed, so the second half proves nothing",
    ).toContain("1 in ruins");
    expect(offered()).toEqual(["Light a fire", "Reinforce a building"]);
    expect(document.querySelector(".hw-preview--repair")).toBeNull();
    expect(screen.queryByRole("button", { name: /mend|repair/i })).toBeNull();
  });

  /**
   * **AND A SHIELD PREVENTS RATHER THAN UNDOES, which the board now says by REFUSING.**
   *
   * This test used to raise a shield over a marked building and assert the mark survived the
   * round. `HARD_WINTER.damage.ruin_at: 2` removed the state it was played in: a building the
   * frost reaches unsheltered is a ruin by the end of that round, so there is no marked
   * building to hold a shield over and no round in which to try. The engine half of the claim
   * lives in `hard-winter.test.ts`'s *"absorbs the bite instead of raising the ceiling, so
   * timing is the whole of it"*, which asserts the same thing over the reducer.
   *
   * What the SURFACE owes, and what a player will actually meet, is the other side of it: the
   * board will not let you spend a round trying to repair what the frost has taken, and it
   * does not charge you for finding out. That is a different refusal path from
   * *"refuses an illegal declaration without charging the round"* below, which walks the
   * abandoned-ground one.
   */
  it("refuses a shield on what the frost already took, and charges nothing for asking", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    await playFireRound(user, 1, "-2,-2", 0);
    const taken = document.querySelector<HTMLElement>('[data-node="NUM.5"]');
    expect(
      taken?.className,
      "the frost has not taken it, so there is nothing to refuse",
    ).toContain("hw-cell--ruin");
    expect(screen.getByText(new RegExp(`Round 2 of ${HARD_WINTER.rounds}`))).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Reinforce a building/i }));
    await user.click(cell("4,0"));
    // Found by TEST ID rather than by `getByRole("alert")`, which was unambiguous only while
    // the refusal was the surface's one alert. A frozen building now announces itself as one
    // too (`FrozenNotice`, the lead's *"some kind of notification/pop up when a city is
    // forzen"*), and this test's subject is the refusal.
    expect(screen.getByTestId("hw-refusal").textContent).toMatch(
      /ruin cannot be reinforced/i,
    );
    expect(screen.getByTestId("hw-refusal").textContent).toMatch(/Nothing was spent/);
    // Still round two, still declaring, and the bill has not moved.
    expect(screen.getByText(new RegExp(`Round 2 of ${HARD_WINTER.rounds}`))).toBeVisible();
    expect(settlementStrip().textContent).toContain("1 in ruins");
  });

  /**
   * **A SHIELD THAT BROKE SAYS SO, because the island cannot say it.**
   *
   * The ruling is that a shield is BINARY on screen — no bar, no count — so the storm roof
   * `city/three/winterShield.ts` lashes over a reinforced building comes off in ONE step, between
   * two frames the player did not ask for. Silent, that is indistinguishable from a rendering
   * bug, and it is also the fact the player's next decision turns on.
   *
   * `buildingThreat.test.ts` proves `winterSpentShields` picks the right buildings out of two
   * engine states. That is not evidence that anything reaches the screen, which is the entire
   * point of the ruling, so this plays the surface until a real shield is really spent and reads
   * the notice out of the DOM.
   *
   * ## RE-FIXTURED 2026-08-01 FOR `damage.ruin_at: 2`, AND THE OLD LINE OF PLAY IS NOW IMPOSSIBLE
   *
   * It spent round one on a zero-accuracy fire so the frost would reach the shoreline Lookout, and
   * reinforced it in round two. At `ruin_at: 6` that left the Lookout marked with two points of
   * six; `#374` landed `ruin_at: 2` against an early bite of 2, so **the first unwarded cold round
   * ruins an unshielded building outright** and there was nothing standing there to reinforce. The
   * failure said so exactly: the cell came back `hw-cell--ruin` where `hw-cell--hurt` was expected.
   *
   * So the shield is bought BEFORE the frost exists at all. Round one opens with nothing frozen —
   * the first advance is part of `end_round` — so one right answer buys `shield_by_tier.weak` on
   * the shoreline Lookout, and that same round's close freezes the shoreline and bites it for
   * `winterDamageBite(1)`. The weak shield and the early bite are equal at this tuning, which is
   * what makes the spend EXACT and leaves the building standing and unmarked; the preconditions
   * below are read off `HARD_WINTER` and fail loudly rather than silently choosing a different
   * story if either number moves again.
   */
  it("announces a shield the round spent to nothing, naming the building", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    /*
     * THE FIXTURE'S ARITHMETIC, DERIVED AND ASSERTED BEFORE IT IS PLAYED.
     *
     * A weak shield has to be worth something, it has to be spent to nothing by the first cold
     * round, and what gets past it has to leave the building STANDING — otherwise the round
     * produces a ruin and `winterSpentShields` deliberately reports nothing for it. All three are
     * consequences of the tuning rather than choices this test makes, so they are read from it.
     */
    /*
      **THE ROUND AND THE TARGET BOTH MOVED ON 2026-08-02, and the arithmetic below is why.**
      This raised a `weak` shield on the shoreline Lookout and read it spent by round ONE's close,
      because a weak shield was 2 points against an opening bite of 2. The bite ladder is 1, 2, 3
      now, so round one's bite of 1 leaves a point of shield standing and nothing is announced.

      Round TWO's bite is 2 and a `weak` shield is 2, so the spend is exact there — and the target
      has to be a building round two's frost reaches, which the shoreline Lookout is not: it goes
      cold in round one. `NUM.4` is on rim band 1, which `spread.accelerate_every: 1` freezes as
      round two closes. All of it is read off `HARD_WINTER` and fails loudly rather than quietly
      choosing a different story if either number moves again.
    */
    const shield = HARD_WINTER.reinforce.shield_by_tier.weak;
    const coldRound = 2;
    const bite = winterDamageBite(coldRound);
    expect(shield, "the weakest tier buys no shield, so none can be spent").toBeGreaterThan(
      0,
    );
    expect(
      shield,
      "a weak shield outlasts the cold round this plays, so nothing is spent",
    ).toBeLessThanOrEqual(bite);
    expect(
      bite - shield,
      "what gets past the weak shield ruins the building, and a ruin is not announced",
    ).toBeLessThan(HARD_WINTER.damage.ruin_at);
    expect(
      coldRound,
      "the cold round is the last one, so no round is left to face bare",
    ).toBeLessThan(HARD_WINTER.rounds);

    // Nothing has broken yet, so the notice must not be on screen. Without this the assertion
    // below is satisfied by a notice that is simply always rendered.
    expect(screen.queryByTestId("hw-shield-spent")).toBeNull();

    // ROUND 1, BEFORE THE FROST REACHES BAND ONE: the weakest shield that is still a shield, on
    // the Commons out on rim band 1, which round two's close is the first to reach.
    await user.click(screen.getByRole("button", { name: /Reinforce a building/i }));
    await user.click(cell("-4,-3"));
    await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));
    await answerBatch(user, 1, 1);
    expect(screen.getByText(/points of shield raised/)).toBeVisible();
    expect(screen.queryByTestId("hw-shield-spent")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Let the frost advance/i }));
    // Round one takes the shoreline only, so nothing has been spent yet.
    expect(screen.queryByTestId("hw-shield-spent")).toBeNull();
    await playFireRound(user, coldRound, "0,0", 0);

    // THE PRECONDITION, RESTATED FOR THIS TUNING: the frost reached the Commons and the shield is
    // why it is still there. Marked would mean the shield let something through and ruined would
    // mean it let everything through, and neither is the state the notice is about.
    const shielded = document.querySelector<HTMLElement>('[data-node="NUM.4"]')?.className;
    expect(
      shielded,
      "the frost never reached NUM.4, so no shield can have been spent on it",
    ).toContain("hw-cell--frozen");
    expect(
      shielded,
      "NUM.4 was lost, and a ruin is deliberately not announced",
    ).not.toContain("hw-cell--ruin");
    expect(
      shielded,
      "the shield let a bite through, so it was not spent absorbing it",
    ).not.toContain("hw-cell--hurt");

    // THE ANNOUNCEMENT, on screen, naming the building whose roof just came off.
    const notice = screen.getByTestId("hw-shield-spent");
    expect(notice).toBeVisible();
    expect(notice.textContent).toContain(placementLabel("NUM.4"));
    // A status rather than an alert: worth hearing, not an interruption.
    expect(notice.getAttribute("role")).toBe("status");
    // And it is not written as a failure — the shield did the job it was bought for.
    expect(notice.textContent).toMatch(/bare/i);

    // AND IT BELONGS TO ITS OWN ROUND. A notice that stayed up would go on telling the player
    // they are unprotected long after they had reinforced something else.
    await playFireRound(user, coldRound + 1, "-2,-2", 3);
    expect(
      screen.queryByTestId("hw-shield-spent"),
      "the spent-shield notice outlived the round it belonged to",
    ).toBeNull();
  });

  /**
   * **AND IT DOES NOT OUTLIVE THE WINTER, which is the non-persistence ruling in words.**
   *
   * A shield does not survive the crisis that raised it, so the sentence *"it faces this round
   * bare"* has nothing to refer to once the frost has stopped: there is no round to face, no
   * shield left on anything, and nothing the player can still do about it. Found by running the
   * suite rather than by reading it — a shield broken on the final round left this notice sitting
   * beside the roll call, and it collided with the conclusion's own `role="status"`.
   *
   * ## RE-FIXTURED 2026-08-01, BECAUSE IT DID NOT REACH THE DEFECT IT IS NAMED FOR
   *
   * It broke a shield in round TWO and then played the winter out. `advanceFrost` recomputes the
   * spent list on every round close, so by the last round the list was empty for an ordinary
   * reason and the `ended` gate was doing nothing at all. Measured: drop `ended` out of
   * `SpentShieldNotice` entirely and the file reported **26 passed, 0 failed**.
   *
   * The defect needs the shield spent and the winter finished in the SAME transition, which is
   * one specific line of play: the heart is the only building the frost reaches as the final
   * round closes, so a `weak` shield bought on that round is raised and emptied by the same
   * `end_round` that ends the crisis. Under that fixture the same injection fails here.
   */
  it("takes the spent-shield notice away when the winter ends", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    for (let round = 1; round < HARD_WINTER.rounds; round += 1) {
      await playFireRound(user, round, "-2,-2", 0);
    }

    // Nothing has broken yet, so what follows is a claim about the LAST round rather than about
    // a notice that had already gone.
    expect(screen.queryByTestId("hw-shield-spent")).toBeNull();

    // THE LAST ROUND BUYS THE SHIELD THAT THE LAST ROUND THEN SPENDS, and that simultaneity is
    // the whole test. The heart is the one building the frost reaches only as the final round
    // closes, and one right answer buys `reinforce.shield_by_tier.weak` — two points against a
    // late bite of three — so the shield is raised and emptied in the same transition that ends
    // the winter. `buildingThreat.test.ts` owns the arithmetic; what is asserted here is that the
    // notice is suppressed by the ending and not merely by having been cleared a round earlier.
    await user.click(screen.getByRole("button", { name: /Reinforce a building/i }));
    await user.click(cell("0,0"));
    await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));
    await answerBatch(user, HARD_WINTER.rounds, 1);
    expect(screen.getByText(/points of shield raised/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Let the frost advance/i }));

    expect(conclusion()).toBeVisible();
    expect(
      screen.queryByTestId("hw-shield-spent"),
      "a notice about facing THIS round bare outlived the last round",
    ).toBeNull();
    // And the conclusion's own status line is unambiguous again, which is what the collision
    // with `liveCityScar.test.tsx` was actually reporting.
    expect(screen.queryAllByRole("status").length).toBeLessThanOrEqual(1);
  }, 120000);

  it("shows a standing building's remaining damage budget when inspected", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    await user.click(cell("0,0"));
    const panel = document.querySelector(".hw-panel--inspect");
    expect(panel?.textContent).toContain("Assembly Hall");
    // PLURALISED FROM THE NUMBER rather than written, because at `damage.ruin_at: 1` the surface
    // says "1 point left in it" and a hardcoded plural was pinning the old threshold.
    const budget = HARD_WINTER.damage.ruin_at;
    expect(panel?.textContent).toContain(
      `${budget} point${budget === 1 ? "" : "s"} left in it`,
    );
    expect(panel?.textContent).toContain("point bite this round");
  });

  it("refuses an illegal declaration without charging the round", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    /*
     * **THE REFUSAL THIS WALKED IS GONE, AND THE ONE THAT REPLACES IT IS THE OTHER GROUND CASE.**
     *
     * It gave up the shoreline and then tried to light a fire on it, for the refusal *"Nobody is
     * left out there to tend a fire, that ring has been abandoned"*. The give-up-ground action was
     * ruled out on 2026-08-02, so LAND is the whole of a fire's legality (`winterActionRefusal`)
     * and a shield on what the frost has taken is the refusal a player meets on this board every
     * time: the Lookout stands on the shoreline, which is exactly what round one's frost takes.
     */
    await playFireRound(user, 1, "-2,-2", 3);
    expect(screen.getByText(new RegExp(`Round 2 of ${HARD_WINTER.rounds}`))).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Reinforce a building/i }));
    await user.click(cell("4,0"));
    // Found by TEST ID rather than by `getByRole("alert")`, which was unambiguous only while
    // the refusal was the surface's one alert. A frozen building now announces itself as one
    // too (`FrozenNotice`, the lead's *"some kind of notification/pop up when a city is
    // forzen"*), and this test's subject is the refusal.
    expect(screen.getByTestId("hw-refusal").textContent).toMatch(
      /ruin cannot be reinforced/i,
    );
    expect(screen.getByTestId("hw-refusal").textContent).toMatch(/Nothing was spent/);
    // Still round two, still declaring.
    expect(screen.getByText(new RegExp(`Round 2 of ${HARD_WINTER.rounds}`))).toBeVisible();
  });

  /**
   * THE NESTED PREVIEW: choosing a cell for a fire shows what every tier would hold from
   * it, before anything is committed.
   *
   * The whole point is that this is a READ-OUT of the choice under consideration, so what
   * is asserted is the correspondence between the three things that must agree — the board's
   * bands, the panel's rows, and the tuning table's cell counts. jsdom can check the
   * correspondence; `hardWinter.browser.test.tsx` checks that the bands are actually
   * distinguishable to look at, which is a different claim and not one a class name can
   * make.
   */
  it("shows the three tier footprints nested on the board once a cell is chosen", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    // Nothing provisional is drawn before a cell is picked: the preview is about a choice,
    // and no choice has been made.
    await user.click(screen.getByRole("button", { name: /Light a fire/i }));
    expect(boardCells("hw-cell--preview")).toHaveLength(0);

    // `(0, -2)` is deep enough that the whole disc is on land, so the board shows the
    // tuning table's own footprint with nothing clipped by the water.
    await user.click(cell("0,-2"));

    // Three nested bands: 1 cell reachable from one right answer, 4 more from two, 8 more
    // from three — 13 in all, which is the top tier's footprint.
    expect(boardCells("hw-cell--preview")).toHaveLength(13);
    expect(boardCells("hw-cell--preview-weak")).toHaveLength(1);
    expect(boardCells("hw-cell--preview-steady")).toHaveLength(4);
    expect(boardCells("hw-cell--preview-strong")).toHaveLength(8);

    // The innermost band is the cell that was actually chosen.
    expect(cell("0,-2").className).toContain("hw-cell--preview-weak");
    // Two cells out is the top tier only, and the diagonal corner of the 5x5 is outside the
    // disc entirely — which is exactly what shrinking the square to a disc did.
    expect(cell("0,0").className).toContain("hw-cell--preview-strong");
    expect(cell("2,0").className).not.toContain("hw-cell--preview");

    // NOT HUE ALONE: every previewed cell carries the score that would reach it.
    const badges = document.querySelectorAll(".hw-grid .hw-cell__need");
    expect(badges).toHaveLength(13);
    expect([...badges].map((b) => b.textContent).sort()).toEqual(
      ["1", ...Array(4).fill("2"), ...Array(8).fill("3")].sort(),
    );
    // And a screen reader is told the same thing the badge says.
    expect(cell("0,0").getAttribute("aria-label")).toContain(
      "would hold this from 3 of 3 correct",
    );

    // The panel reads the same footprint back, per tier, with the buildings named.
    expect(document.querySelector(".hw-preview__title")?.textContent).toContain(
      "A fire at (0, -2) would hold",
    );
    const ladder = document.querySelector(".hw-ladder--preview");
    expect(ladder?.textContent).toContain("13 cells (15% of the island)");
    expect(ladder?.textContent).toContain("5 cells (6% of the island)");
    expect(ladder?.textContent).toContain("1 cell (1% of the island)");

    // Picking a different cell moves the whole figure rather than adding to it.
    await user.click(cell("-3,-2"));
    expect(boardCells("hw-cell--preview")).toHaveLength(13);
    expect(cell("-3,-2").className).toContain("hw-cell--preview-weak");
    expect(cell("0,-2").className).not.toContain("hw-cell--preview-weak");
    // That cell holds a building, so the innermost band already names one.
    expect(
      document.querySelector(".hw-ladder--preview li:last-child")?.textContent,
    ).toMatch(/1 of 3: 1 cell \(1% of the island\), and \w/);

    // Committing clears the preview: it was a hypothesis, and the declaration has replaced
    // it with a fact nobody has earned the size of yet.
    await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));
    expect(boardCells("hw-cell--preview")).toHaveLength(0);
    expect(document.querySelector(".hw-ladder--preview")).toBeNull();
  });

  /**
   * A fire on the shore covers less ground, and the preview says so rather than repeating
   * the tuning table's inland figure. This is the reason the preview is measured per cell
   * at all — and it is a real decision in the encounter, because the shoreline is where the
   * frost arrives first and where a fire is worth least.
   */
  it("reports a shore fire as the smaller thing it really is", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    await user.click(screen.getByRole("button", { name: /Light a fire/i }));
    await user.click(cell("4,0"));

    // (4, 0) is on the eastern shoreline: the disc's eastern arm falls in the water.
    const previewed = boardCells("hw-cell--preview").length;
    expect(previewed).toBeLessThan(13);
    expect(previewed).toBeGreaterThan(0);

    const ladder = document.querySelector(".hw-ladder--preview");
    expect(ladder?.textContent).toContain("9 cells (10% of the island");
    expect(ladder?.textContent).toContain("the water clips it here, from 13 cells inland");
    // The shoreline Tower stands there, so even the innermost band names a building.
    expect(ladder?.textContent).toContain("Tower");
  });

  /*
   * **TWO PULL-BACK TESTS LIVED HERE AND WENT WITH THE ACTION (2026-08-02).** The lead: *"the give
   * up ground option is incredibly confusing - just discard it completely and keep it to two
   * options."* Each is named with what it asserted, because a re-instatement owes the same claims:
   *
   *  - ***"prices a pull-back in ground, before it is committed"***. Abandoning was free on a
   *    compact city because its price was denominated in buildings and the outer rings were empty;
   *    the price became the GROUND, which is never empty, and a cost the player only discovered in
   *    the outcome would have been the same defect wearing a bill. So it asserted the price at the
   *    moment of choosing: on the button (*"28 cells"*, *"given up for good"*, *"84 material"*), on
   *    the board (the whole shoreline band outlined, every cell wearing the cross a ruin wears so
   *    the state was never hue alone), in the spoken label (*"would ruin this ground for good"*),
   *    and in the panel with the cost stated FIRST because it is the reverse decision from lighting
   *    a fire.
   *  - ***"separates ground the frost took from ground the settlement gave up"***. The outcome
   *    billed only the second, and the running total was on the settlement strip mid-winter rather
   *    than only at the end. It also asserted an ABSENCE that survives without it: the concluding
   *    card does not report the frost's own cell tally, under D-CRISIS-30's second clause, which is
   *    still asserted in *"ends after its rounds with a roll call and no claim of earnings"*.
   *
   * The map key's two entries, the provisional outline and the two-treatment distinction they
   * rested on are gone from `WinterGrid` and `HardWinterSurface` with them. What survives is
   * `HARD_WINTER.reclaim_cost_per_cell`, which the city's crisis-generic ground repair still
   * charges: `crisis-damage.test.ts` is where it is asserted now.
   */

  /**
   * The layout varies per encounter, because in the real game the player chooses where
   * every building goes and a fire tuned against one arrangement is tuned against a
   * fiction. Encounter one is the tuning baseline; pressing "New winter" deals the next.
   */
  it("deals a different city each new winter, and names which one", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    expect(screen.getByText(/This city:/).textContent).toContain("Spread out");
    // The baseline layout's own signature: the Lookout out on the eastern shoreline.
    expect(cell("4,0").getAttribute("data-node")).toBe("NUM.5");

    await user.click(
      screen.getByRole("button", { name: /New winter \(deals the next city/i }),
    );

    expect(screen.getByText(/This city:/).textContent).not.toContain("Spread out");
    // A different board: nothing stands on the eastern shore in the packed city.
    expect(cell("4,0").getAttribute("data-node")).toBeNull();
    // Still six buildings, still round one.
    expect(document.querySelectorAll(".hw-grid [data-node]")).toHaveLength(6);
    expect(screen.getByText(new RegExp(`Round 1 of ${HARD_WINTER.rounds}`))).toBeVisible();
    expect(boardCells("hw-cell--frozen")).toHaveLength(0);
  });

  it("draws cumulatively: fewer skills reached means a narrower pool", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    const dev = screen
      .getByRole("heading", { name: /How far has this learner got/i })
      .closest("section") as HTMLElement;
    expect(dev.textContent).toContain(WINTER_NODE_ORDER.join(", "));

    await user.click(within(dev).getByRole("button", { name: "1 skill" }));
    expect(dev.textContent).toContain(WINTER_NODE_ORDER[0] as string);
    expect(dev.textContent).not.toContain(WINTER_NODE_ORDER.join(", "));

    // And the winter restarted, so the change cannot be made mid-encounter.
    expect(screen.getByText(new RegExp(`Round 1 of ${HARD_WINTER.rounds}`))).toBeVisible();
    expect(boardCells("hw-cell--frozen")).toHaveLength(0);
  });

  /**
   * THE SURFACE READS REAL PROGRESS, which is the half of the defect that lived here: the
   * eligible count was initialised at `WINTER_NODE_ORDER.length` and no learner state was
   * consulted, so the crisis would ask about a lesson nobody had opened. The entry advisor
   * (PR #308) promises the opposite in as many words.
   *
   * The pool arithmetic is `crisisQuestionPool.test.ts`; this is the wiring.
   */
  it("draws from the practised set it is handed, and says so", () => {
    const practised = WINTER_NODE_ORDER.slice(0, 2);
    render(<HardWinterSurface readMasteredNodes={() => practised} />);

    const dev = screen
      .getByRole("heading", { name: /How far has this learner got/i })
      .closest("section") as HTMLElement;
    expect(dev.textContent).toContain(`Drawing from ${practised.length} nodes`);
    expect(dev.textContent).toContain(practised.join(", "));
    expect(dev.textContent).toContain("this learner's real practised set");
    // The unpractised ones are not in the drawing line. Checked on the reading rather than
    // on the whole panel, because the chips name every node by construction.
    const reading = dev.querySelector(".hw-dev__reading")?.textContent ?? "";
    for (const node of WINTER_NODE_ORDER.slice(2)) {
      expect(reading, `${node} is eligible without having been practised`).not.toContain(
        node,
      );
    }
    // And the real count is on the chip that clears the override.
    expect(
      within(dev).getByRole("button", { name: `Real progress (${practised.length})` }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  /**
   * A learner with nothing practised is ASKED FROM THE ERA rather than refused.
   *
   * This used to be a refusal — "No batch to ask", no question, nothing to press — and it made
   * the crisis unplayable from a fresh session, which is the state a demo machine is in. The
   * ruling and its evidence are `hardWinterItems.winterDrawSetFromIds` and
   * `city/crisisFromAFreshSession.test.tsx`; what is checked here is that the surface asks, and
   * that it corrects the advisor's promise while doing so.
   */
  it("asks from era one's authored nodes when the learner has practised nothing", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={() => []} />);

    await user.click(screen.getByRole("button", { name: /Light a fire/i }));
    await user.click(cell("-2,-2"));
    await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));

    expect(screen.queryByRole("heading", { name: "No batch to ask" })).toBeNull();
    expect(screen.queryByText(/has reached none/)).toBeNull();
    expect(screen.getByRole("heading", { name: "Question 1 of 3" })).toBeVisible();
    expect(screen.getByRole("textbox")).toBeVisible();

    // And it says so, because the entry advisor promised the opposite.
    expect(
      document.querySelector(".hw-note--draw")?.textContent ?? "",
      "the fallback fired silently",
    ).toMatch(/have not finished a practice set/i);

    // The dev read-out names the source too, so the leniency is visible on the tuning route
    // rather than only in the panel that is asking.
    const dev = screen
      .getByRole("heading", { name: /How far has this learner got/i })
      .closest("section") as HTMLElement;
    expect(dev.textContent).toContain(`Drawing from ${WINTER_NODE_ORDER.length} nodes`);
    expect(dev.textContent).toContain("era one's authored nodes");
    // Still no override armed: this is the real draw, not a dev chip.
    expect(within(dev).getByRole("button", { name: "Real progress (0)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  /**
   * AND IT DOES NOT FIRE FOR A LEARNER WHO HAS PRACTISED. Without this the fallback would be
   * indistinguishable from ignoring progress altogether, which is the defect the surface's
   * real-progress read was added to fix in the first place.
   */
  it("keeps the practised draw, and the correction note off it, at one practised lesson", () => {
    render(<HardWinterSurface readMasteredNodes={() => WINTER_NODE_ORDER.slice(0, 1)} />);

    expect(document.querySelector(".hw-note--draw")).toBeNull();
    const dev = screen
      .getByRole("heading", { name: /How far has this learner got/i })
      .closest("section") as HTMLElement;
    expect(dev.textContent).toContain("Drawing from 1 node");
    expect(dev.textContent).toContain("this learner's real practised set");
  });

  /**
   * **WHAT IS NO LONGER ON THE QUESTION SCREEN, ITEM BY ITEM.**
   *
   * The lead: *"in general, the question answering interface just has too much random stuff on
   * it. just keep it to its essential elements"*, and by name *"remove the tracker on what
   * actions have been taken so far"* and *"theres' too much like bookeeping on '88 tiles ___'"*.
   *
   * ## THE FLOOR COMES FIRST, and it is what stops this passing over a blank screen
   *
   * A sweep of `not.toContain` assertions is satisfied perfectly by a surface that rendered
   * nothing at all, or by one stuck in the declaring phase where none of these strings would
   * appear anyway. So the KEPT half is asserted first, positively, and it doubles as the
   * justification for each survivor: the question, the field, the round counter, the frost's
   * forecast and the stake. If any of those goes missing this test fails before it reaches a
   * single absence.
   *
   * ## Each absence is paired with the reason it is one
   *
   * Not a list of strings to grep for, because a string can vanish for the wrong reason. Every
   * entry names the element and what it would have supported, and the surface is driven into the
   * ANSWERING phase first, which is the screen the objection was about.
   */
  it("strips the question screen to what a decision needs, and says what went", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    // A reinforce rather than a pull-back, which is what this drove into the answering phase
    // until 2026-08-02. The declaration only has to be SOMETHING, because what is under test is
    // the question screen.
    await user.click(screen.getByRole("button", { name: /Reinforce a building/i }));
    await user.click(cell("0,0"));
    await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));

    const asking = screen
      .getByRole("heading", { name: "Question 1 of 3" })
      .closest("section") as HTMLElement;

    /* THE FLOOR. Each of these is a survivor with a reason, and the sweep below is meaningless
       without them. */
    expect(asking.querySelector(".hw-question")).not.toBeNull();
    expect(screen.getByRole("textbox"), "no field to answer in").toBeVisible();
    // The stake: the only thing on this screen that says why the questions matter.
    expect(asking.textContent).toContain("You declared:");
    // How many rounds are left, which is the biggest input to spend-now-or-hold.
    expect(screen.getByText(new RegExp(`Round 1 of ${HARD_WINTER.rounds}`))).toBeVisible();
    // And the frost's FORECAST, which is the number a fire is aimed with. Worded as #328 left
    // it, with the frozen-cell count that led the same line taken off.
    expect(screen.getByText(/1 step of frost this round/)).toBeVisible();

    /* AND WHAT WENT. Read over the whole shell, not only the question panel, because two of
       these lived in the masthead and one below the board. */
    const shell = document.querySelector(".hw-shell") as HTMLElement;
    const gone: readonly (readonly [what: string, needle: RegExp])[] = [
      // The running answer tally. A tracker of actions taken; the heading says which question
      // this is, the action is locked, and all three must be answered either way.
      ["the running answer tally", /right so far|questions to come/],
      // The frost's own running total, in the model's units. Where the frost has reached is a
      // thing the player reads off the island in one look.
      ["the frozen-cell tally", /cells frozen/],
      // The held-ground running total, same units, same argument.
      ["the held-ground tally", /Holding \d+ of \d+ cells/],
      // A fire's coordinates and the ground it holds: both are drawn on the board, and the pair
      // of numbers is the same fact said in grid indices.
      ["a fire's coordinates in the settlement read-out", /Fire at \(/],
      // The negations the settlement block opened with while nothing was wrong.
      [
        "the nothing-is-wrong negations",
        /none damaged|none given up|Nothing falls at the end/,
      ],
    ];
    for (const [what, needle] of gone) {
      expect(
        shell.textContent ?? "",
        `${what} is still on the question screen`,
      ).not.toMatch(needle);
    }
    // A floor on the sweep itself, so a shortened list cannot quietly stop checking.
    expect(gone.length).toBeGreaterThanOrEqual(5);
  });

  it("ends after its rounds with a roll call and no claim of earnings", async () => {
    const user = userEvent.setup();
    render(<HardWinterSurface readMasteredNodes={allPractised} />);

    for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
      await playFireRound(user, round, "-2,-2", 0);
    }

    expect(screen.getByText("Winter is over")).toBeVisible();
    const report = conclusion();

    /*
      THE VERDICT IS A SENTENCE ABOUT THE OUTCOME, not the count in a heading it replaces.
      *"1 of 6 came through, 1 of them scarred"* is the roll restated, and the player still has
      to do the comparison; this winter lost five buildings and the screen says so.
    */
    /*
      **AND THE WORST WINTER AVAILABLE IS NOW A TOTAL LOSS**, which is `ruin_at: 2`'s doing and
      is where it reaches the player's screen. These lines read *"The winter took five of your
      six buildings."* and a `mauled` verdict while the heart came through the last cold round
      scarred; one cold round is the whole building now, and the frost reaches every band by the
      last round, so nothing is left. `HARD_WINTER.damage.ruin_at` records it as a cost of the
      2026-08-01 ruling: "answer nothing and lose everything" is literally true again.
    */
    expect(report.textContent).toContain("Nothing came through the winter.");
    expect(report.dataset.verdict).toBe("lost");

    // AND EVERY BUILDING IS ON THE ROLL WITH ITS STATE, which is the damage list. Six ruins
    // and nothing else: this read five ruins and one scar at `ruin_at: 6`.
    const tiles = Array.from(report.querySelectorAll<HTMLElement>(".hw-roll-tiles li"));
    expect(tiles).toHaveLength(WINTER_NODE_ORDER.length);
    expect(tiles.filter((tile) => tile.dataset.state === "ruin")).toHaveLength(6);
    expect(tiles.filter((tile) => tile.dataset.state === "scarred")).toHaveLength(0);
    expect(tiles.filter((tile) => tile.dataset.state === "whole")).toHaveLength(0);

    // The other half of what the lead asked a report to be about, and the panel this replaces
    // never mentioned it at all. Derived from the tuning rather than the 15 it read, which was
    // three questions a round over five rounds.
    expect(report.textContent).toMatch(
      new RegExp(
        `You answered \\d+ of ${HARD_WINTER.rounds * HARD_WINTER.batch_size} right`,
      ),
    );

    // Every building is still named on the BOARD too, because a ruin is not a deletion.
    for (const nodeId of WINTER_NODE_ORDER) {
      expect(document.querySelector(`[data-node="${nodeId}"]`)).not.toBeNull();
    }

    // The economy seam's idempotency key is gone from the player's screen: it is a developer
    // artefact and never belonged in front of a player.
    expect(report.textContent).not.toContain("hard_winter:prehistoric:w1");
    expect(report.textContent).not.toContain("Nothing was paid");

    /*
      AND THE BILL IS THE ONLY FIGURE IN CURRENCY ON IT. This line read
      `toMatch(/You earned \d+ XP/)` until the claim was cut: the card named XP, gold and
      material off `hardWinterPayoutFor` and none of the three was ever credited, there being no
      winter reason code or grant recipe in `packages/economy` to credit them with. What the
      screen owes is the cost, which the crisis really does charge on the island afterwards.

      Re-pointed here rather than deleted, and re-pointed POSITIVELY, because this test walks the
      real surface through a real winter and is therefore the one place the claim is measured
      over the shipped DOM. `winterConclusion.test.ts` carries the same sweep across all five
      endings, which is the coverage this single played winter (`mauled`) cannot have.
    */
    // THE ERA'S OWN MATERIAL, resolved rather than pinned: the card reads "stone" in era one since
    // 2026-08-02, and era two would read "grain".
    expect(report.textContent).toMatch(
      new RegExp(
        `Putting the settlement back costs \\d+ ${materialWord(CURRENT_ERA_ID)}\\.`,
      ),
    );
    expect(report.textContent).not.toMatch(/\byou (?:earned|gained|were paid)\b/i);
    expect(report.textContent).not.toMatch(/\bXP\b/);
    expect(report.textContent).not.toMatch(/\bgold\b/i);
    expect(screen.getByRole("button", { name: "New winter" })).toBeVisible();
  }, 60000);
});
