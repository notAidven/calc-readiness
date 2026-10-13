import { D1_PRACTICE_POOL, type FrozenItem } from "@cr/item-bank";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { lessonByNode } from "./domains";
import { EraInfinitePractice } from "./EraInfinitePractice";
import { eraBestStreakKey } from "./InfiniteDrill";
import { recordStruggleAttempt } from "./struggleStore";
import { slotsForTier } from "./struggleWeights";

const fixedItem =
  D1_PRACTICE_POOL.find(
    (item) =>
      item.answer.answer_spec.answer_type === "numeric" &&
      item.answer.answer_key &&
      !item.answer.answer_spec.simplification,
  ) ?? D1_PRACTICE_POOL[0];

if (!fixedItem?.answer.answer_key) {
  throw new Error("expected a gradable D1 practice item for EraInfinitePractice tests");
}

const unlockedNode = fixedItem.node_id;

/**
 * What the component actually handed the scheduler, so the gate can be read directly.
 *
 * **THE SEAM MOVED** from `createInterleavedScheduler` to
 * `createAdaptiveInterleavedScheduler` when the drill started leaning on the skills the
 * learner is struggling with. Intercepting the old name here left `items` empty and this
 * file green on four of its cases, which is worth recording: a spy on the wrong factory
 * does not fail, it silently measures nothing.
 */
const scheduled = vi.hoisted(() => ({
  items: [] as FrozenItem[],
  weights: new Map<string, number>() as ReadonlyMap<string, number>,
  itemWeight: undefined as ((item: FrozenItem) => number) | undefined,
}));

vi.mock("./infiniteScheduler", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./infiniteScheduler")>();
  return {
    ...actual,
    createAdaptiveInterleavedScheduler: (
      items: readonly FrozenItem[],
      weights: ReadonlyMap<string, number>,
      _rng?: () => number,
      itemWeight?: (item: FrozenItem) => number,
    ) => {
      scheduled.items = [...items];
      scheduled.weights = weights;
      scheduled.itemWeight = itemWeight;
      return { next: () => fixedItem };
    },
  };
});

beforeEach(() => {
  scheduled.items = [];
  scheduled.weights = new Map();
  scheduled.itemWeight = undefined;
  localStorage.clear();
});

describe("EraInfinitePractice", () => {
  it("renders a problem with a streak counter and hides the skill label while answering", () => {
    const { container } = render(
      <EraInfinitePractice
        eraId="prehistoric"
        completedNodeIds={[unlockedNode]}
        onExit={() => {}}
      />,
    );

    expect(container.querySelector(".infinite-practice__streak-count")).toBeTruthy();
    expect(container.querySelector(".infinite-practice__skill")).toBeNull();
    expect(screen.getByRole("button", { name: /^check$/i })).toBeInTheDocument();
  });

  it("raises the streak on a correct answer and then reveals the skill label", () => {
    const { container } = render(
      <EraInfinitePractice
        eraId="prehistoric"
        completedNodeIds={[unlockedNode]}
        onExit={() => {}}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: fixedItem.answer.answer_key },
    });
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));

    expect(screen.getByText("Correct! Nice work.")).toBeInTheDocument();
    expect(container.querySelector(".infinite-practice__streak-count")?.textContent).toBe(
      "1",
    );
    expect(container.querySelector(".infinite-practice__skill")?.textContent).toBe(
      lessonByNode[fixedItem.node_id]?.title ?? fixedItem.node_id,
    );
  });

  it("banks the best streak under the ERA's key, not a domain's", () => {
    render(
      <EraInfinitePractice
        eraId="prehistoric"
        completedNodeIds={[unlockedNode]}
        onExit={() => {}}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: fixedItem.answer.answer_key },
    });
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));

    expect(localStorage.getItem(eraBestStreakKey("prehistoric"))).toBe("1");
    // The pre-era key must not be written any more, or a reset that clears one key would
    // leave the other behind.
    expect(localStorage.getItem("cr.infinitePractice.bestStreak.domain.d1")).toBeNull();
  });

  it("reveals the skill label after a skip", () => {
    const { container } = render(
      <EraInfinitePractice
        eraId="prehistoric"
        completedNodeIds={[unlockedNode]}
        onExit={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    expect(container.querySelector(".infinite-practice__skill")?.textContent).toBe(
      lessonByNode[fixedItem.node_id]?.title ?? fixedItem.node_id,
    );
  });

  it("draws only from the era's completed nodes", () => {
    render(
      <EraInfinitePractice
        eraId="prehistoric"
        completedNodeIds={[unlockedNode]}
        onExit={() => {}}
      />,
    );

    expect(scheduled.items.length).toBeGreaterThan(0);
    expect(new Set(scheduled.items.map((item) => item.node_id))).toEqual(
      new Set([unlockedNode]),
    );
    // The gate is only meaningful if the era has skills it held back.
    expect(new Set(D1_PRACTICE_POOL.map((item) => item.node_id)).size).toBeGreaterThan(1);
  });

  it("takes the whole era when the gate is bypassed", () => {
    render(
      <EraInfinitePractice eraId="prehistoric" completedNodeIds="all" onExit={() => {}} />,
    );

    expect(new Set(scheduled.items.map((item) => item.node_id)).size).toBeGreaterThan(1);
  });

  it("locks the drill and points at a practice set when no skill is completed", () => {
    const { container } = render(
      <EraInfinitePractice eraId="prehistoric" completedNodeIds={[]} onExit={() => {}} />,
    );

    expect(screen.getByText(/Finish a lesson's practice set to unlock/i)).toBeVisible();
    expect(container.querySelector(".infinite-practice__streak-count")).toBeNull();
    expect(screen.queryByRole("button", { name: /^check$/i })).toBeNull();
    expect(scheduled.items).toHaveLength(0);
  });

  it("locks the drill when the completed skills belong to another era", () => {
    render(
      <EraInfinitePractice
        eraId="prehistoric"
        completedNodeIds={["EXP.1"]}
        onExit={() => {}}
      />,
    );

    expect(screen.getByText(/Finish a lesson's practice set to unlock/i)).toBeVisible();
    expect(scheduled.items).toHaveLength(0);
  });

  it("revisits another era's practiced skills when the host asks it to", () => {
    // The opt-in half of the case above: SAME props, one flag, opposite outcome. The hub
    // passes it because interleaved practice is the only always-available thing to do
    // there and this era's own skills cannot be finished yet.
    const otherEraSkills = ["EXP.1", "RAD.2"];
    render(
      <EraInfinitePractice
        eraId="prehistoric"
        completedNodeIds={otherEraSkills}
        whenEraCannotMix="revisit-practiced"
        onExit={() => {}}
      />,
    );

    expect(screen.queryByText(/Finish a lesson's practice set to unlock/i)).toBeNull();
    expect(new Set(scheduled.items.map((item) => item.node_id))).toEqual(
      new Set(otherEraSkills),
    );
  });

  it("stops naming the era in the locked hint once the pool has looked past it", () => {
    // A learner who has practised nothing at all, in a host that already widened the pool:
    // "in this era" would send them looking for this era's lessons when no era's would
    // help. The pool did look wider, and the copy has to be able to say it did not find
    // anything either.
    render(
      <EraInfinitePractice
        eraId="prehistoric"
        completedNodeIds={[]}
        whenEraCannotMix="revisit-practiced"
        onExit={() => {}}
      />,
    );

    const hint = screen.getByText(/Finish a lesson's practice set to unlock/i);
    expect(hint).toBeVisible();
    expect(hint.textContent).toContain("No completed skills yet.");
    expect(hint.textContent).not.toContain("in this era");
  });

  /*
   * DELETED WITH D6: "locks rather than throwing for an era whose packs are unauthored".
   *
   * It rendered the drill for an era the pool could serve nothing for, under the dev
   * bypass, and expected the locked panel rather than a throw. The era came from an
   * `UNAUTHORED_ERA` search (deleted from the head of this file along with it) so that it
   * could not be aimed at an era since authored, and the instruction on finding none was
   * to delete rather than re-aim. D6 (Functions, #422) is the run that empties the search:
   * on the tree that PR and `integration` make together, the least-served era offers four
   * skills.
   *
   * WHAT IS NO LONGER CHECKED is the combination, not the panel. The locked panel is
   * still driven three times above this line, and all three reach it down the same branch
   * this one did, an empty pool: `completedNodeIds={[]}`, a completed set belonging to
   * another era, and a widened pool with nothing practised anywhere. What has no case left
   * is `completedNodeIds="all"` over an era with no content, because no such era is left
   * to render.
   */

  it("weights the mix by how the learner has been doing, one entry per node it drew", () => {
    // The wiring, at the seam: whatever the store says, EVERY node in the pool arrives with
    // a weight. A missing entry would be read as one slot by the scheduler, so a partial map
    // is the failure that would never show up as an error, only as a drill that quietly
    // stopped adapting for some skills.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      recordStruggleAttempt({
        nodeId: unlockedNode,
        templateId: fixedItem.template_id,
        difficulty: fixedItem.difficulty,
        correct: false,
        firstTry: false,
        revealed: true,
        hintsUsed: 0,
      });
    }

    render(
      <EraInfinitePractice
        eraId="prehistoric"
        completedNodeIds={[unlockedNode]}
        onExit={() => {}}
      />,
    );

    const nodes = new Set(scheduled.items.map((item) => item.node_id));
    expect(nodes.size).toBeGreaterThan(0);
    expect([...scheduled.weights.keys()].sort()).toEqual([...nodes].sort());
    // And the node the learner just failed eight times is the one carrying extra slots.
    expect(scheduled.weights.get(unlockedNode)).toBe(slotsForTier("struggling"));
  });

  it("also hands over the SHAPE weighting, which is a second axis and a second seam", () => {
    // The lesson at the head of this file, applied to the new argument: a captured factory
    // that ignores an argument reports nothing about it. So the argument is captured, and it
    // is EXERCISED rather than merely checked for presence — a function that returned 1 for
    // everything would satisfy `toBeTypeOf("function")` and leave the draw uniform.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      recordStruggleAttempt({
        nodeId: unlockedNode,
        templateId: fixedItem.template_id,
        difficulty: fixedItem.difficulty,
        correct: false,
        firstTry: false,
        revealed: true,
        hintsUsed: 0,
      });
    }

    render(
      <EraInfinitePractice
        eraId="prehistoric"
        completedNodeIds={[unlockedNode]}
        onExit={() => {}}
      />,
    );

    const itemWeight = scheduled.itemWeight;
    expect(itemWeight, "the component served the drill no shape weighting").toBeTypeOf(
      "function",
    );
    const missed = itemWeight?.(fixedItem) ?? 0;
    const untouched =
      scheduled.items.find((item) => item.template_id !== fixedItem.template_id) ??
      fixedItem;
    expect(missed).toBeGreaterThan(1);
    expect(missed).toBeGreaterThan(itemWeight?.(untouched) ?? 0);
  });

  it("gives a skill in hand a single slot, so the weighting is not always on", () => {
    // The other end, which is what stops the assertion above passing over a map that hands
    // out the maximum to everything.
    render(
      <EraInfinitePractice
        eraId="prehistoric"
        completedNodeIds={[unlockedNode]}
        onExit={() => {}}
      />,
    );
    expect(scheduled.weights.get(unlockedNode)).toBe(slotsForTier("solid"));
  });

  it("pairs authenticated correct-answer evidence with the struggle level from before the answer", () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      recordStruggleAttempt({
        nodeId: unlockedNode,
        templateId: fixedItem.template_id,
        difficulty: fixedItem.difficulty,
        correct: false,
        firstTry: false,
        revealed: true,
        hintsUsed: 0,
      });
    }
    const onCorrectEvidence = vi.fn();
    render(
      <EraInfinitePractice
        eraId="prehistoric"
        completedNodeIds={[unlockedNode]}
        onCorrectEvidence={onCorrectEvidence}
        onExit={() => {}}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: fixedItem.answer.answer_key },
    });
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));

    expect(onCorrectEvidence).toHaveBeenCalledTimes(1);
    expect(onCorrectEvidence.mock.calls[0]?.[0]).toMatchObject({
      sessionCorrect: 1,
      nodeId: fixedItem.node_id,
      itemVersionId: fixedItem.item_version_id,
      struggleLevel: 1,
    });
  });

  it("throws for an id that is not an era at all, rather than reading as an empty one", () => {
    // An unknown era and an era the pool cannot serve must not be indistinguishable: the
    // second is a real product state and the first is a bug, hence `getEraOrThrow`.
    expect(() =>
      render(
        // @ts-expect-error - the point of the test is the id the type system rejects.
        <EraInfinitePractice eraId="d1" completedNodeIds="all" onExit={() => {}} />,
      ),
    ).toThrow(/Unknown era/);
  });
});
