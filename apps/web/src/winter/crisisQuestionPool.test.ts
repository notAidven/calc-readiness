import { HARD_WINTER } from "@cr/game";
import type { Mastery } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { PRACTICED_MASTERY } from "../lessons/lessonProgress";
import {
  WINTER_NODE_ORDER,
  winterBatchFor,
  winterDrawSetFromIds,
  winterEligibleNodes,
  winterEligibleNodesFromIds,
} from "./hardWinterItems";

/**
 * THE PROMISE THE ENTRY ADVISOR MAKES, ASSERTED WHERE PROGRESS LIVES.
 *
 * The crisis-call briefing tells the player, in these words, that each round they *"answer
 * {n} questions drawn from lessons you have already done"*. That sentence is a claim about
 * two things this file owns:
 *
 *  1. **which set the crisis draws from** — the learner's own practised nodes, `mastery >= 1`
 *     through `lessonProgress.completedNodeIdsFrom`, and not every node of the era. The
 *     surface used to assume all six regardless of what the learner had opened;
 *  2. **that every node in that set is reachable** — the engine's half is
 *     `hard-winter-pool.test.ts`, and this drives the shipped pool and the shipped seeding so
 *     the claim holds over the real item bank rather than over a fixture.
 *
 * D-CRISIS-14's era-one exception is the ruling behind (1): *"Hard Winter draws 100% from era
 * one's own mastered nodes."*
 */

function states(
  entries: readonly [nodeId: string, mastery: Mastery][],
): readonly { node_id: string; mastery: Mastery }[] {
  return entries.map(([node_id, mastery]) => ({ node_id, mastery }));
}

/** Every node id the crisis actually asks about, over a whole encounter. */
function askedNodes(eligible: readonly string[], encounter = 1): Set<string> {
  const asked = new Set<string>();
  for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
    const batch = winterBatchFor({ masteredNodeIds: eligible, encounter, round });
    if (batch.status !== "ready") {
      throw new Error(`round ${round}: ${batch.message}`);
    }
    for (const prompt of batch.prompts) {
      asked.add(prompt.node_id);
    }
  }
  return asked;
}

describe("the crisis draws from what this learner has actually done", () => {
  it("counts a node once its first practice set is scored, and not before", () => {
    const [first, second] = WINTER_NODE_ORDER;
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    // `mastery: 0` is a node the learner has never scored a set on. A diagnostic test-out
    // leaves exactly that while marking the node complete, which is why completion status is
    // not usable here and `lessonProgress` is.
    expect(
      winterEligibleNodes(
        states([
          [first as string, 0],
          [second as string, PRACTICED_MASTERY],
        ]),
      ),
    ).toEqual([second]);
  });

  it("ignores practised nodes the winter has no items for", () => {
    // A node from another domain entirely. Counting it would make the composer refuse a round
    // for a pool it was never going to be able to serve.
    expect(winterEligibleNodesFromIds(["LIN.1", ...WINTER_NODE_ORDER.slice(0, 2)])).toEqual(
      WINTER_NODE_ORDER.slice(0, 2),
    );
  });

  it("keeps the eligible set in the pool's own node order, whatever order progress arrives in", () => {
    const reversed = [...WINTER_NODE_ORDER].reverse();
    expect(winterEligibleNodesFromIds(reversed)).toEqual(WINTER_NODE_ORDER);
  });

  /**
   * THE ADVISOR'S SENTENCE, as a property of the shipped draw: a learner who has practised
   * three of the six meets questions about those three and about nothing else, over a whole
   * encounter and over twenty of them.
   */
  it("never asks about a lesson the learner has not done", () => {
    const practised = WINTER_NODE_ORDER.slice(0, 3);
    const notPractised = WINTER_NODE_ORDER.slice(3);
    expect(notPractised.length).toBeGreaterThan(0);

    for (let encounter = 1; encounter <= 20; encounter += 1) {
      const asked = askedNodes(practised, encounter);
      for (const node of notPractised) {
        expect(
          asked.has(node),
          `encounter ${encounter} asked about unpractised ${node}`,
        ).toBe(false);
      }
      expect([...asked].sort()).toEqual([...practised].sort());
    }
  });

  /**
   * THE OTHER HALF, AND THE ONE THE DEFECT BROKE. A learner who has done all six must be able
   * to meet all six. `batch_size` is 3 and the round-robin used to stop there over the
   * caller's array order, so nodes four, five and six were unreachable at every seed:
   * measured before the fix at three of six reached over 240 seeded batches.
   */
  it("asks about every practised lesson once the learner has done more than a batch's worth", () => {
    const asked = askedNodes(WINTER_NODE_ORDER);
    const missed = WINTER_NODE_ORDER.filter((node) => !asked.has(node));
    expect(missed, "these practised lessons can never be asked about").toEqual([]);

    // Named, because the fourth is the first the truncation could not reach and a count would
    // be satisfied by any six.
    expect(asked.has(WINTER_NODE_ORDER[3] as string)).toBe(true);
    expect(asked.has(WINTER_NODE_ORDER[4] as string)).toBe(true);
    expect(asked.has(WINTER_NODE_ORDER[5] as string)).toBe(true);
    // The floor: era one really does have more nodes than a batch has slots, so this is a
    // claim about a set the truncation could bite.
    expect(WINTER_NODE_ORDER.length).toBeGreaterThan(HARD_WINTER.batch_size);
  });

  /** And it happens inside ONE encounter, which is the scope D-CRISIS-15 rules over. */
  it("covers all six inside a single encounter, not only across many", () => {
    for (let encounter = 1; encounter <= 20; encounter += 1) {
      const asked = askedNodes(WINTER_NODE_ORDER, encounter);
      expect(
        [...asked].sort(),
        `encounter ${encounter} left a practised lesson unasked`,
      ).toEqual([...WINTER_NODE_ORDER].sort());
    }
  });

  /**
   * A wider eligible set is not a longer round. `batch_size` is a tuning constant and the
   * action tier is a ratio of it, so opening the pool must change WHICH questions appear and
   * never HOW MANY.
   */
  it("still asks exactly batch_size questions at every eligible-set size", () => {
    for (let count = 1; count <= WINTER_NODE_ORDER.length; count += 1) {
      for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
        const batch = winterBatchFor({
          masteredNodeIds: WINTER_NODE_ORDER.slice(0, count),
          encounter: 1,
          round,
        });
        if (batch.status !== "ready") {
          throw new Error(`${count} node(s), round ${round}: ${batch.message}`);
        }
        expect(batch.prompts, `${count} node(s), round ${round}`).toHaveLength(
          HARD_WINTER.batch_size,
        );
      }
    }
  });

  /**
   * A learner below the batch size is REFUSED rather than served a shorter round, which is
   * INV-CRISIS-9 and which the entry sequence has to respect: the crisis cannot announce
   * itself to somebody it has nothing to ask.
   */
  it("refuses rather than shortening when nothing has been practised", () => {
    const batch = winterBatchFor({ masteredNodeIds: [], encounter: 1, round: 1 });
    expect(batch.status).toBe("unavailable");
    if (batch.status === "unavailable") {
      expect(batch.reason).toBe("nothing_mastered");
      expect(batch.wanted).toBe(HARD_WINTER.batch_size);
    }
  });

  /**
   * ONE PRACTISED NODE IS ENOUGH, because era one's nodes carry more than `batch_size` items
   * each. Worth pinning: it is the difference between "the crisis needs three lessons" and
   * "the crisis needs one", and D-CRISIS-9 sizes the trigger at three mastered.
   */
  it("can still fill a round from a single practised lesson", () => {
    const batch = winterBatchFor({
      masteredNodeIds: WINTER_NODE_ORDER.slice(0, 1),
      encounter: 1,
      round: 1,
    });
    expect(batch.status).toBe("ready");
    if (batch.status === "ready") {
      expect(batch.prompts).toHaveLength(HARD_WINTER.batch_size);
      expect(new Set(batch.prompts.map((p) => p.item_version_id)).size).toBe(
        HARD_WINTER.batch_size,
      );
    }
  });
});

/**
 * **AND WHAT HAPPENS WHEN THE PRACTISED SET CANNOT FILL A BATCH AT ALL.**
 *
 * The refusal above is right about the pool and wrong about the product: the ☰ menu's entry is
 * deliberately open below the crisis's trigger, so an empty practised set is a state the game
 * routes players into on purpose — and a fresh install is exactly the state a demo machine is
 * in. `winterDrawSetFromIds` is the fallback, and the two things it must never do are widen
 * silently or widen for somebody who does not need it.
 */
describe("the draw set falls back to the era rather than to nothing", () => {
  it("hands back era one's authored nodes for a learner who has practised nothing", () => {
    const draw = winterDrawSetFromIds([]);
    expect(draw.source).toBe("era");
    expect(draw.nodeIds).toEqual(WINTER_NODE_ORDER);
    // And the round it produces is a real one, not a shorter one: the tier is a ratio of
    // `batch_size`, so a thin batch would quietly hand out wider bonfires.
    for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
      const batch = winterBatchFor({
        masteredNodeIds: draw.nodeIds,
        encounter: 1,
        round,
      });
      expect(batch.status, `round ${round}`).toBe("ready");
      if (batch.status === "ready") {
        expect(batch.prompts, `round ${round}`).toHaveLength(HARD_WINTER.batch_size);
      }
    }
  });

  /**
   * THE FALLBACK IS NOT THE DEFAULT. Every non-empty practised set keeps its own draw, at every
   * size from one node to six — including one, which is the size the refusal's neighbouring
   * "one practised lesson is enough" makes possible and where a count-based threshold would
   * have widened wrongly.
   */
  it("keeps the practised draw at every set size the learner can actually reach", () => {
    for (let count = 1; count <= WINTER_NODE_ORDER.length; count += 1) {
      const practised = WINTER_NODE_ORDER.slice(0, count);
      const draw = winterDrawSetFromIds(practised);
      expect(draw.source, `${count} practised node(s) widened to the era`).toBe(
        "practised",
      );
      expect(draw.nodeIds).toEqual(practised);
    }
  });

  /**
   * A set of nodes the winter has no items for is the same case as an empty one, and it is the
   * reason the threshold is the POOL'S depth rather than the array's length: a learner whose
   * only progress is outside era one would otherwise be handed a "practised" draw the composer
   * then refuses, which is the original defect with an extra step in front of it.
   */
  it("treats progress the pool cannot serve as no progress at all", () => {
    const draw = winterDrawSetFromIds(["LIN.1", "EL.6"]);
    expect(draw.source).toBe("era");
    expect(draw.nodeIds).toEqual(WINTER_NODE_ORDER);
  });

  /** Idempotent over an already-narrowed set, because both mounts hand one over. */
  it("is unchanged by narrowing the set before handing it in", () => {
    const practised = WINTER_NODE_ORDER.slice(0, 2);
    expect(winterDrawSetFromIds(winterEligibleNodesFromIds(practised))).toEqual(
      winterDrawSetFromIds(practised),
    );
  });
});
