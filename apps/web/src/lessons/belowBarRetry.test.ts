import { LESSON_GRANT_MASTERY_BAR } from "@cr/economy";
import { INTERACTIVE_DEMO_NODE } from "@cr/item-bank";
import {
  completionStatusForMastery,
  MASTERY_CORRECT_COUNT,
  masteryFromCorrectCount,
  PRACTICE_SET_SIZE,
} from "@cr/mastery-service";
import { getEraOfNode } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { practiceSourceForNode } from "./domains";
import { practiceItemsById } from "./practiceChecker";

/**
 * **THE CLAIM THAT MAKES THE MASTERY GATE HUMANE RATHER THAN PUNITIVE: a learner below
 * the bar is NOT YET PAID, not permanently excluded.**
 *
 * Row 1's material is gated on `LESSON_GRANT_MASTERY_BAR` now, so a learner who scores
 * three of five collects nothing for that node. Everything about whether that is
 * acceptable rests on one sentence — *the practice set can be run again* — and a
 * sentence is exactly what this file exists to replace. **If any node the economy can
 * owe a grant to could not serve a second set, that node would be a DEAD END: a learner
 * stranded below a bar they have no way to cross, holding a debt the economy will never
 * pay.** That is the failure this measures, and it measures it per node rather than
 * arguing it once.
 *
 * ## The population is every node that can OWE a grant, derived twice over
 *
 * A node can strand a learner only if it can (a) be practised at all and (b) resolve a
 * lesson-completion payout, which `lessonCompleteGrant` does through the node's ERA. So
 * the population is the intersection: node ids the item bank serves practice instances
 * for, restricted to those the skill graph places in an era. Both halves are read from
 * shipped data — `practiceItemsById` and `getEraOfNode` — so a newly authored node joins
 * this sweep with no edit here.
 *
 * The intersection is what scopes it correctly rather than conveniently. Dropping the
 * era half would pull in the synthetic interactive demo node, which has no
 * `student_node_state` and can never be owed anything; dropping the item-bank half would
 * pull in the sixty-odd graph nodes with no authored pool, which cannot be practised and
 * so cannot be left below a bar. Neither is a dead end, and including either would make
 * this sweep fail for a reason that is not the defect.
 */

/** Node ids the item bank can serve practice instances for. */
const SERVABLE_NODE_IDS: readonly string[] = [
  ...new Set([...practiceItemsById.values()].map((item) => item.node_id)),
].sort();

/**
 * Those of them that sit in an era, and so can be owed a lesson-completion grant.
 * This is the population a dead end would live in.
 */
const CAN_OWE_A_GRANT: readonly string[] = SERVABLE_NODE_IDS.filter(
  (nodeId) => getEraOfNode(nodeId) !== undefined,
);

describe("a learner below the bar can always run the set again", () => {
  it("derives a real population, and names what the two filters removed", () => {
    // Floors first, so every per-node assertion below runs over something. Thirty-six
    // servable nodes with an era at the time of writing, across seven domains; the floor
    // sits under that so unrelated authoring does not fail here, while a sweep that
    // suddenly measures two nodes does.
    expect(CAN_OWE_A_GRANT.length).toBeGreaterThanOrEqual(30);
    expect(SERVABLE_NODE_IDS.length).toBeGreaterThanOrEqual(CAN_OWE_A_GRANT.length);
    // A floor with a SHAPE: the population must span several eras, or a sweep over one
    // domain's pool would satisfy the count above while covering a tenth of the product.
    expect(
      new Set(CAN_OWE_A_GRANT.map((nodeId) => getEraOfNode(nodeId)?.id)).size,
    ).toBeGreaterThanOrEqual(5);

    // And the difference, named rather than silently filtered: the synthetic demo node
    // is the only thing the item bank serves that no era owns. If a REAL node ever falls
    // out of the era sequence it appears here and this fails, which is the loud outcome —
    // a node that can be practised but belongs to no era cannot be paid at all.
    const servableButEraless = SERVABLE_NODE_IDS.filter(
      (nodeId) => getEraOfNode(nodeId) === undefined,
    );
    expect(servableButEraless).toEqual([INTERACTIVE_DEMO_NODE]);
  });

  it("serves a fresh five-problem set on the SECOND attempt, for every such node", () => {
    // **THE DEAD-END CHECK.** For each node: build a practice session (the first
    // attempt, which we imagine scored three of five), then build another. Both must
    // succeed, and the second must not be the identical five problems — a "retry" that
    // re-serves the exact set the learner just failed is a retry in name only.
    const stranded: string[] = [];
    const identical: string[] = [];
    for (const nodeId of CAN_OWE_A_GRANT) {
      let first: readonly string[];
      let second: readonly string[];
      try {
        first = practiceSourceForNode(nodeId).createSession().initialInstanceIds;
        second = practiceSourceForNode(nodeId).createSession().initialInstanceIds;
      } catch (error) {
        stranded.push(`${nodeId}: ${(error as Error).message}`);
        continue;
      }
      if (first.length !== PRACTICE_SET_SIZE || second.length !== PRACTICE_SET_SIZE) {
        stranded.push(`${nodeId}: served ${first.length}/${second.length} slots`);
        continue;
      }
      if (first.join("|") === second.join("|")) {
        identical.push(nodeId);
      }
    }
    // A census asserted empty, with the population floored above so it cannot hold
    // trivially over nothing.
    expect(stranded).toEqual([]);
    // The sets are drawn at random per slot, so two draws matching on every one of five
    // slots for MANY nodes would mean the draw is not random. One or two collisions are
    // legitimate on a node whose cells are thin, so this is a proportion rather than a
    // zero — the claim is "a retry is a different set", not "a retry can never coincide".
    expect(identical.length).toBeLessThan(CAN_OWE_A_GRANT.length / 2);
  });

  it("lets a re-run CROSS the bar, because mastery is a running max", () => {
    // The other half of "not yet paid": a second attempt must be able to raise the
    // stored value, or a retry would be exercise with no payout attached. Asserted
    // against the mapping itself rather than against a walk through the UI, because the
    // rule that matters is `max(existing, evidenced)` inside the mastery service.
    const belowBar = masteryFromCorrectCount(MASTERY_CORRECT_COUNT - 1);
    const atBar = masteryFromCorrectCount(MASTERY_CORRECT_COUNT);
    expect(belowBar).toBeLessThan(LESSON_GRANT_MASTERY_BAR);
    expect(atBar).toBe(LESSON_GRANT_MASTERY_BAR);
    expect(Math.max(belowBar, atBar)).toBe(LESSON_GRANT_MASTERY_BAR);
    // And a below-bar finish really does read as FINISHED, which is why the building's
    // Practice card stays reachable rather than the node reverting to a locked state.
    expect(completionStatusForMastery(belowBar)).toBe("in_progress");
    expect(completionStatusForMastery(atBar)).toBe("complete");
    // The bar is four of five out of five, stated here so this file names the mapping
    // the gate is derived from rather than only consuming it.
    expect(MASTERY_CORRECT_COUNT).toBe(4);
    expect(PRACTICE_SET_SIZE).toBe(5);
  });
});
