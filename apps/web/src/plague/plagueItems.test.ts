import { PLAGUE, PLAGUE_ERA, plagueWindow } from "@cr/game";
import { ERA_SEQUENCE, getEraOrThrow } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  PLAGUE_ITEM_POOL,
  PLAGUE_NODE_ORDER,
  PLAGUE_SERVED_NODES,
  PLAGUE_WINDOW_ERAS,
  plagueBatchForCycle,
  plagueDrawSetFromIds,
  plagueEraOfNode,
} from "./plagueItems";

/**
 * **ERA SIX'S QUESTION WINDOW SPANS THREE AGES, AND THIS IS WHERE THE POOL IS MEASURED AGAINST IT.**
 *
 * Era one's crisis draws from era one, so its pool is one domain and there is nothing to measure.
 * D-CRISIS-14 gives era six the current era plus the two behind it at 40 / 35 / 25 — renaissance,
 * medieval and classical — so the pool spans four authored domains, and two separate things can go
 * wrong that never could for era one: a bucket the bank cannot serve, and a bucket this module has
 * misidentified.
 *
 * ## THE CONTENT GAP IS CLOSED, AND THIS IS THE TEST THAT SAID SO
 *
 * `POL.6` and `POL.7` were graph-reading lessons the bank authored nothing for, so era six
 * contributed four of its own six nodes to its own 40 percent share, and the pair was named here
 * as a measured exception rather than left as a comment — *"the day somebody authors items for
 * those two nodes this test says so."* It said so: both nodes have practice templates now, and
 * era six's share is servable all six ways. The exception is gone rather than loosened, and what
 * replaces it is the stronger claim that the window has no unserved node at all.
 *
 * `composePlagueBatch` still drops a node the pool cannot serve and reallocates rather than
 * refusing. That mechanism is unchanged; there is simply no node in the window exercising it.
 */

describe("the window this module pools for is the engine's own", () => {
  it("reaches era six plus the two ages behind it, derived rather than written down", () => {
    expect(PLAGUE_WINDOW_ERAS[0]).toBe(PLAGUE_ERA);
    expect(PLAGUE_WINDOW_ERAS.length).toBe(PLAGUE.window.eras_back + 1);
    // The same eras the engine's own window reports, in the same order. Asserted against a second
    // derivation rather than against three literals, so a retune of `eras_back` moves both.
    expect(PLAGUE_WINDOW_ERAS).toEqual(
      plagueWindow({ mastered: [] }).map((bucket) => bucket.era),
    );
    // And they really are three consecutive ages ending at era six, which a list of any three
    // eras would not be.
    const numbers = PLAGUE_WINDOW_ERAS.map((era) =>
      ERA_SEQUENCE.findIndex((entry) => entry.id === era),
    );
    expect(numbers).toEqual([numbers[0], (numbers[0] ?? 0) - 1, (numbers[0] ?? 0) - 2]);
  });

  it("orders the nodes by era and keeps each era's authored order inside it", () => {
    expect(PLAGUE_NODE_ORDER).toEqual(
      PLAGUE_WINDOW_ERAS.flatMap((era) => getEraOrThrow(era).nodes),
    );
    // A floor, because every assertion below passes trivially over an empty list.
    expect(PLAGUE_NODE_ORDER.length).toBeGreaterThanOrEqual(15);
    expect(new Set(PLAGUE_NODE_ORDER).size).toBe(PLAGUE_NODE_ORDER.length);
    for (const nodeId of PLAGUE_NODE_ORDER) {
      expect(plagueEraOfNode(nodeId), nodeId).toBeDefined();
    }
  });
});

describe("the pool the batch draws from", () => {
  it("serves every node in the window, with no exception left to name", () => {
    // THE COMPOSITION, not just a count: which nodes are unserved is the deliverable, because a
    // count would be satisfied by any node and the names are what a content pass has to fix.
    const unserved = PLAGUE_NODE_ORDER.filter(
      (nodeId) => !PLAGUE_SERVED_NODES.includes(nodeId),
    );
    expect(unserved).toEqual([]);
    // Floors under an emptiness claim, which would otherwise hold over an empty window: the
    // window is a real set of nodes and every one of them is in the served list.
    expect(PLAGUE_NODE_ORDER.length).toBeGreaterThanOrEqual(15);
    expect(PLAGUE_SERVED_NODES.length).toBe(PLAGUE_NODE_ORDER.length);
    // And era six's own share is servable every way the age has, which is what keeps its 40
    // percent from collapsing onto one lesson. Asserted as the whole membership rather than as a
    // floor of four, because four was the number the two unauthored nodes left it with.
    const own = getEraOrThrow(PLAGUE_ERA).nodes;
    expect(own.filter((nodeId) => PLAGUE_SERVED_NODES.includes(nodeId))).toEqual(own);
    expect(own.length).toBeGreaterThanOrEqual(6);
  });

  it("holds only items inside the window, and enough of them to fill a cycle", () => {
    expect(PLAGUE_ITEM_POOL.length).toBeGreaterThan(PLAGUE.cycle.batch_size * 4);
    for (const candidate of PLAGUE_ITEM_POOL) {
      expect(plagueEraOfNode(candidate.node_id), candidate.node_id).toBeDefined();
      expect(candidate.prompt.length, candidate.item_version_id).toBeGreaterThan(0);
    }
    // No duplicate instances, or a cycle could ask the same question twice.
    expect(new Set(PLAGUE_ITEM_POOL.map((item) => item.item_version_id)).size).toBe(
      PLAGUE_ITEM_POOL.length,
    );
  });
});

describe("what a cycle asks when the learner has practised nothing", () => {
  /**
   * The fallback is the winter's, for the winter's reason: the dev entry is reachable below the
   * trigger on purpose, so an empty practised set is a state the game routes a reviewer into and a
   * fresh install is exactly the state a demo machine is in. It draws the questions and grants no
   * evidence.
   */
  it("falls back to the whole window, and says which set it used", () => {
    const cold = plagueDrawSetFromIds([]);
    expect(cold.source).toBe("window");
    expect(cold.nodeIds).toEqual(PLAGUE_SERVED_NODES);

    // One practised lesson the pool can serve deeply enough keeps drawing from that lesson, which
    // is the honest case and is why the threshold is the pool's depth rather than a node count.
    const one = plagueDrawSetFromIds(["RAT.1"]);
    expect(one.source).toBe("practised");
    expect(one.nodeIds).toEqual(["RAT.1"]);

    // A practised node the window does not reach is not eligible at all: counting it would make the
    // composer refuse a cycle for a pool it was never going to be able to serve.
    const outside = plagueDrawSetFromIds(["EXP.1"]);
    expect(outside.source).toBe("window");
  });

  it("draws a full batch on every cycle of a settled-length encounter", () => {
    // Deterministic in `(encounter, cycle)`, so the same outbreak replays identically.
    for (let cycle = 1; cycle <= 8; cycle += 1) {
      const batch = plagueBatchForCycle({
        masteredNodeIds: PLAGUE_SERVED_NODES,
        encounter: 1,
        cycle,
      });
      expect(batch.status, `cycle ${cycle}`).toBe("ready");
      if (batch.status !== "ready") {
        throw new Error("unreachable");
      }
      expect(batch.prompts.length).toBe(PLAGUE.cycle.batch_size);
      // Every prompt names which age it came from, which is the only thing that makes the ruled
      // mix visible on the screen.
      for (const prompt of batch.prompts) {
        expect(PLAGUE_WINDOW_ERAS).toContain(prompt.era);
      }
      // And it is reproducible: the same call gives the same three instances.
      const again = plagueBatchForCycle({
        masteredNodeIds: PLAGUE_SERVED_NODES,
        encounter: 1,
        cycle,
      });
      expect(again).toEqual(batch);
    }
  });

  /**
   * **THE RULED MIX, MEASURED OVER A WHOLE ENCOUNTER.**
   *
   * D-CRISIS-14's shares are 40 / 35 / 25 and a batch is three questions, so no single cycle can
   * realise them. The engine apportions rather than samples, which means the realised share tracks
   * the ruled one at EVERY prefix — and this is the assertion that era six's own age really does get
   * the largest share rather than the smallest, which is what a uniform draw across nodes would have
   * given it (23 percent against the ruled 40).
   */
  it("gives era six's own age the largest share of a long encounter", () => {
    const counts = new Map<string, number>();
    for (let cycle = 1; cycle <= 10; cycle += 1) {
      const batch = plagueBatchForCycle({
        masteredNodeIds: PLAGUE_SERVED_NODES,
        encounter: 3,
        cycle,
      });
      if (batch.status !== "ready") {
        throw new Error(`cycle ${cycle} could not be served`);
      }
      for (const prompt of batch.prompts) {
        counts.set(prompt.era, (counts.get(prompt.era) ?? 0) + 1);
      }
    }
    const asked = [...counts.values()].reduce((sum, count) => sum + count, 0);
    expect(asked).toBe(PLAGUE.cycle.batch_size * 10);
    const own = counts.get(PLAGUE_ERA) ?? 0;
    for (const [era, count] of counts) {
      if (era !== PLAGUE_ERA) {
        expect(own, `${era} was asked more often than era six itself`).toBeGreaterThan(
          count,
        );
      }
    }
    // And it is near the ruled share rather than merely the biggest: 40 percent of thirty is
    // twelve, and the apportionment cannot be more than a question out at any prefix.
    const ruled = (PLAGUE.window.shares_percent[0] ?? 0) / 100;
    expect(Math.abs(own / asked - ruled)).toBeLessThan(0.05);
  });
});
