import { D1_PRACTICE_POOL, type FrozenItem } from "@cr/item-bank";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { type DrillAttemptEvent, InfiniteDrill } from "./InfiniteDrill";
import type { InfiniteScheduler } from "./infiniteScheduler";

/**
 * **WHAT THE DRILL TELLS ITS HOST, AND WHAT IT TELLS THE LEARNER BEFORE THEY ANSWER.**
 *
 * Two properties, in one file because they are two halves of the same seam.
 *
 * The host needs EVERY resolved problem, not only the wins, because a store fed only the
 * correct answers cannot tell a learner who is fine from one who is skipping everything.
 * `onCorrectAnswer` was the only thing that escaped this drill until the struggle store
 * existed, so `onAttempt` is what made the signal observable at all.
 *
 * The learner must NOT be told which skill an unanswered problem belongs to. Working that
 * out from the question alone is the thing interleaved practice teaches that a node-scoped
 * drill cannot, so the skill label is withheld until the problem resolves.
 *
 * **This file replaces `infiniteDrillStruggleChip.test.tsx`.** Four of that file's cases
 * covered a "Focus skill" badge that has been deleted; these are its three surviving
 * `onAttempt` cases plus the skill-label gate the badge used to be held to.
 */

afterEach(cleanup);

function stubItem(nodeId: string, itemVersionId: string): FrozenItem {
  return {
    item_version_id: itemVersionId,
    node_id: nodeId,
    form: "A",
    template_id: "stub",
    template_params: {},
    prompt: "What is the value?",
    difficulty: 1,
    hints: [],
    worked_solution: ["It is one."],
    answer: {
      answer_key: "1",
      answer_spec: { answer_type: "numeric" },
      allowed_symbols: [],
    },
  } as unknown as FrozenItem;
}

/** Serves one item forever, so the test drives the phase rather than the draw. */
function oneItemScheduler(item: FrozenItem): InfiniteScheduler {
  return { next: () => item };
}

/**
 * A REAL pool item, for the one case that has to be answered CORRECTLY.
 *
 * The stub above is enough wherever the outcome is a miss or a skip, because neither reaches
 * the checker's verdict. A correct answer does, and the checker resolves its version from
 * the item's registered id — so a stub grades as incorrect however right the answer is, and
 * the ordering case below would have passed over an `onCorrectAnswer` that never fired.
 */
const gradableItem =
  D1_PRACTICE_POOL.find(
    (item) =>
      item.answer.answer_spec.answer_type === "numeric" &&
      item.answer.answer_key &&
      !item.answer.answer_spec.simplification,
  ) ?? D1_PRACTICE_POOL[0];

if (!gradableItem?.answer.answer_key) {
  throw new Error("expected a gradable D1 practice item for the drill attempt tests");
}

function renderDrill(onAttempt?: (event: DrillAttemptEvent) => void): void {
  const item = stubItem("RAT.5", "rat5-1");
  render(
    <InfiniteDrill
      scheduler={oneItemScheduler(item)}
      storageKey="cr.test.bestStreak"
      backLabel="Back"
      skillLabelFor={() => "Rational expressions"}
      onAttempt={onAttempt}
      onExit={() => {}}
    />,
  );
}

describe("the skill a problem belongs to is withheld until it is answered", () => {
  it("names no skill while the learner is still answering", () => {
    renderDrill();
    expect(screen.queryByText("Rational expressions")).toBeNull();
  });

  it("names it once the problem is resolved, so the gate is a gate and not an absence", () => {
    renderDrill();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.getByText("Rational expressions")).toBeTruthy();
  });
});

describe("the drill reports every resolved problem, not only the wins", () => {
  it("reports a skip as a skip, which is what tells guessing from working", () => {
    const attempts: DrillAttemptEvent[] = [];
    renderDrill((event) => {
      attempts.push(event);
    });
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.outcome).toBe("skipped");
    expect(attempts[0]?.item.node_id).toBe("RAT.5");
  });

  it("reports a wrong answer as incorrect rather than as a skip", () => {
    // The two are one keystroke apart on this surface — both reveal the answer and both
    // reset the streak — and the store weighs them differently on purpose. A drill that
    // collapsed them would record a learner who tried and missed as one who did not try.
    const attempts: DrillAttemptEvent[] = [];
    renderDrill((event) => {
      attempts.push(event);
    });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(attempts.map((event) => event.outcome)).toEqual(["incorrect"]);
  });

  it("hands the whole item over, so a host can read the SHAPE and not just the skill", () => {
    // The shape grain rests on this: the store keys a bucket by `template_id`, and it can
    // only do that because the event carries the item rather than a node id.
    const attempts: DrillAttemptEvent[] = [];
    renderDrill((event) => {
      attempts.push(event);
    });
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(attempts[0]?.item.template_id).toBe("stub");
    expect(attempts[0]?.item.difficulty).toBe(1);
  });

  it("reports the attempt BEFORE the session tally, so the tally sees it", () => {
    // Order matters here and no type can catch it: a host that folds the attempt into a
    // store and then reads that store from `onCorrectAnswer` would be one answer behind.
    // Driven through a CORRECT answer, because that is the only path that fires both and
    // therefore the only one where an ordering claim means anything.
    const calls: string[] = [];
    render(
      <InfiniteDrill
        scheduler={oneItemScheduler(gradableItem)}
        storageKey="cr.test.bestStreak"
        backLabel="Back"
        onAttempt={() => calls.push("attempt")}
        onCorrectAnswer={() => calls.push("tally")}
        onExit={() => {}}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: gradableItem.answer.answer_key },
    });
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));
    expect(calls).toEqual(["attempt", "tally"]);
  });
});
