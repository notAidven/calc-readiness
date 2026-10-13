/**
 * EVERY QUESTION THE CRISIS CAN ASK HAS A SOLUTION TO SHOW.
 *
 * The surface now renders `WorkedSolution` after every answered crisis question. That
 * component returns `null` when the item has neither a registered SVG worked solution nor
 * any authored steps, so "the solution is always on screen" is a claim about the POOL and
 * not only about the panel: one item without either would show a verdict and nothing else,
 * on exactly the surface where the explanation is the point.
 *
 * ## The population, and why it is this one
 *
 * Derived from `WINTER_ITEM_POOL`, which is itself `D1_PRACTICE_ITEMS` mapped to candidates,
 * so nothing is written down here that a pulled item could leave behind. The scope is
 * "every item the crisis can draw" rather than "the items round one happens to deal",
 * because the batch is seeded on `(encounter, round)` and a tuning session walks both: a
 * guard scoped to one draw would pass over a pool with a hole three rounds deep in it.
 *
 * `drawsOnlyFromThePool` closes the derivation from the other end. The population is only
 * the right one if the composer really draws from it, so a sweep of real batches asserts
 * every id it deals is a pool id.
 */

import { describe, expect, it } from "vitest";
import { getWorkedSolutionVisual } from "../lessons/workedSolutionVisuals";
import {
  WINTER_ITEM_POOL,
  WINTER_NODE_ORDER,
  winterBatchFor,
  winterFrozenItem,
} from "./hardWinterItems";

/** What `WorkedSolution` needs to render anything at all. */
function hasSomethingToShow(itemVersionId: string): boolean {
  const frozen = winterFrozenItem(itemVersionId);
  if (frozen === undefined) {
    return false;
  }
  return (
    getWorkedSolutionVisual(frozen.template_id) !== undefined ||
    frozen.worked_solution.length > 0
  );
}

describe("the crisis pool can always answer the question it asked", () => {
  it("gives every drawable item a worked solution, over a pool with a floor under it", () => {
    const naked = WINTER_ITEM_POOL.filter(
      (candidate) => !hasSomethingToShow(candidate.item_version_id),
    ).map((candidate) => candidate.item_version_id);

    expect(naked, "these items would show a verdict and no solution").toEqual([]);

    /*
     * THE FLOOR, because "none of them are naked" is satisfied by a pool with nothing in it.
     * Both numbers are measured at this tip rather than chosen: 234 items over 6 nodes. They
     * are asserted as lower bounds so authoring more of either cannot fail this, and as
     * bounds at all so deleting the pool cannot pass it.
     */
    expect(WINTER_ITEM_POOL.length).toBeGreaterThanOrEqual(200);
    expect(new Set(WINTER_ITEM_POOL.map((c) => c.node_id)).size).toBeGreaterThanOrEqual(6);
    expect(WINTER_NODE_ORDER.length).toBeGreaterThanOrEqual(6);
  });

  /**
   * The population above is only the right one if the composer draws from it. Swept over
   * every prefix of the node order and the first six rounds of the first six encounters,
   * which is more of the seeded space than a tuning session walks.
   */
  it("draws only from that pool, at every accuracy prefix and over 36 seeded batches", () => {
    const pool = new Set(WINTER_ITEM_POOL.map((candidate) => candidate.item_version_id));
    let dealt = 0;

    for (let prefix = 1; prefix <= WINTER_NODE_ORDER.length; prefix += 1) {
      for (let encounter = 1; encounter <= 6; encounter += 1) {
        for (let round = 1; round <= 6; round += 1) {
          const batch = winterBatchFor({
            masteredNodeIds: WINTER_NODE_ORDER.slice(0, prefix),
            encounter,
            round,
          });
          if (batch.status !== "ready") {
            continue;
          }
          for (const prompt of batch.prompts) {
            expect(
              pool.has(prompt.item_version_id),
              `${prompt.item_version_id} is not in the pool this guard measured`,
            ).toBe(true);
            expect(
              hasSomethingToShow(prompt.item_version_id),
              `${prompt.item_version_id} was dealt with no solution to show`,
            ).toBe(true);
            dealt += 1;
          }
        }
      }
    }

    // The floor again: a sweep that dealt nothing would satisfy every assertion inside it.
    expect(dealt, "the sweep dealt no questions").toBeGreaterThanOrEqual(100);
  });
});
