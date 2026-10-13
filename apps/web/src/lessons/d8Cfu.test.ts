/**
 * D8's two check-your-understanding cards, graded through the checker that actually grades
 * them.
 *
 * An `accepted` list is not evidence about anything on its own: a lesson whose `cfu.check` is
 * set is graded by `cfuChecker`, and the list is only consulted for form-sensitive CFUs that
 * carry no `check` at all. So a D8 CFU could carry a plausible list, a plausible key, and still
 * be ungradable — a key the checker cannot parse comes back `invalid_input` for every learner,
 * and nothing else in the suite reads these two packs' keys.
 *
 * The card refuses a non-numeric response BEFORE the checker sees it (`isNumericLiteral`, so
 * that "Evaluate" prompts get the computed value rather than the expression they were given).
 * That guard is why the accepted lists here hold only numeric literals: a spelling with a unit
 * on it would be advertised by the pack and rejected by the card, which is a contradiction the
 * learner discovers by being marked wrong for copying the lesson.
 */

import { describe, expect, it } from "vitest";
import { isNumericLiteral } from "./answerFormat";
import { CFU_CHECKER_VERSION, cfuChecker, cfuItemVersionId } from "./cfuChecker";
import { d8LessonByNode } from "./d8";

/** What the card does with one typed response, guard included. */
function submit(nodeId: string, raw: string): "correct" | "refused" | "wrong" {
  if (!isNumericLiteral(raw)) {
    return "refused";
  }
  const result = cfuChecker({
    raw_answer: raw,
    item_version_id: cfuItemVersionId(nodeId),
    equivalence_checker_version: CFU_CHECKER_VERSION,
  });
  return result.client_correct ? "correct" : "wrong";
}

/** Each node with the near miss its own slides warn about, which must NOT pass. */
const NODES: readonly { nodeId: string; key: string; nearMisses: readonly string[] }[] = [
  {
    nodeId: "EL.1",
    key: "16",
    // 64 divides one more time instead of two; 4096/4 reads the ratio the wrong way round.
    nearMisses: ["64", "1024", "4"],
  },
  {
    nodeId: "EL.3",
    key: "5",
    // 81 is the multiple one step short; 243/3 is the division that answers the wrong question.
    nearMisses: ["4", "81", "3"],
  },
];

describe("D8's CFUs are gradable by the checker that grades them", () => {
  it.each(NODES.map((node) => [node.nodeId, node] as const))(
    "%s registers its key with the CFU checker and accepts it",
    (nodeId, node) => {
      const lesson = d8LessonByNode[nodeId];
      expect(lesson, `${nodeId} is not loaded`).toBeDefined();
      const cfu = lesson?.cfu;
      expect(cfu?.check?.answer_type, `${nodeId} has no numeric check`).toBe("numeric");
      expect(cfu?.check?.answer_key, `${nodeId}'s key moved`).toBe(node.key);
      expect(submit(nodeId, node.key)).toBe("correct");
    },
  );

  it.each(NODES.map((node) => [node.nodeId, node] as const))(
    "%s grades every spelling it advertises as correct",
    (nodeId, node) => {
      const accepted = d8LessonByNode[nodeId]?.cfu?.accepted ?? [];
      // Containment over an empty list is free, so the floor is asserted first.
      expect(accepted.length, `${nodeId} advertises nothing`).toBeGreaterThan(0);
      for (const spelling of accepted) {
        expect(submit(nodeId, spelling), `${nodeId} rejects its own ${spelling}`).toBe(
          "correct",
        );
      }
      expect(accepted).toContain(node.key);
    },
  );

  it.each(NODES.map((node) => [node.nodeId, node] as const))(
    "%s still refuses the misconceptions its lesson is about",
    (nodeId, node) => {
      for (const miss of node.nearMisses) {
        expect(submit(nodeId, miss), `${nodeId} accepted ${miss}`).toBe("wrong");
      }
    },
  );
});
