import { describe, expect, it } from "vitest";

import { buildRandomizedD1PracticeSet, D1_PRACTICE_NODES } from "./d1";
import { buildRandomizedD2PracticeSet, D2_PRACTICE_NODES } from "./d2";
import { buildRandomizedD5PracticeSet, D5_PRACTICE_NODES } from "./d5";
import { answerVarietyKey, drawSpreadByShape } from "./practiceSelect";
import type { FrozenItem } from "./template";

/**
 * The set-level variety guard, over the shared assembler every domain draws through.
 *
 * The pool freezers enforce a `varietyKey` per (node, difficulty) CELL, and
 * `buildRandomizedSetByShape` walked the cells independently, so nothing watched across
 * them: one five-slot set could serve the same answer from two different cells. Measured
 * over 2000 sets per node before the fix, that hit 9.1% of EXP.1 sets (`x^5` is reachable
 * from the L1 product shape, the L2 net shape AND the L3 build shape), 19.7% of NUM.5 and
 * 25.1% of RAT.6. Reattempt variety was already fine; this was purely within-set.
 */

/** Every (domain, node) a learner can draw a set for, each closed over its own builder. */
const DOMAIN_NODES = [
  ...D1_PRACTICE_NODES.map(
    (node) =>
      ["D1", node, (rng: () => number) => buildRandomizedD1PracticeSet(node, rng)] as const,
  ),
  ...D2_PRACTICE_NODES.map(
    (node) =>
      ["D2", node, (rng: () => number) => buildRandomizedD2PracticeSet(node, rng)] as const,
  ),
  ...D5_PRACTICE_NODES.map(
    (node) =>
      ["D5", node, (rng: () => number) => buildRandomizedD5PracticeSet(node, rng)] as const,
  ),
];

function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

describe("a served practice set never repeats one answer across its cells", () => {
  it.each(DOMAIN_NODES)("%s %s", (_domain, node, build) => {
    const rng = seededRng(1234);
    for (let run = 0; run < 400; run += 1) {
      const set = build(rng);
      const answers = set.map(answerVarietyKey);
      expect(new Set(answers).size, `${node} run ${run}: ${answers.join(" | ")}`).toBe(
        answers.length,
      );
    }
  });
});

describe("the seen-set is a preference, never a cost", () => {
  const item = (id: string, templateId: string, key: string): FrozenItem =>
    ({
      item_version_id: id,
      template_id: templateId,
      node_id: "N",
      difficulty: 2,
      template_params: {},
      prompt: id,
      hints: [],
      worked_solution: [],
      answer: { answer_key: key, answer_spec: {} },
    }) as unknown as FrozenItem;

  it("still fills every slot when EVERY candidate repeats a seen answer", () => {
    const candidates = [item("a", "t1", "5"), item("b", "t2", "5"), item("c", "t1", "5")];
    const seen = new Set(["k:5"]);
    const picked = drawSpreadByShape(candidates, 2, seededRng(7), seen);
    expect(picked).toHaveLength(2);
    expect(new Set(picked.map((i) => i.item_version_id)).size).toBe(2);
  });

  it("prefers the unseen answer inside a shape when one is available", () => {
    const candidates = [item("dup", "t1", "5"), item("fresh", "t1", "9")];
    const picked = drawSpreadByShape(candidates, 1, seededRng(7), new Set(["k:5"]));
    expect(picked.map((i) => i.item_version_id)).toEqual(["fresh"]);
  });

  it("keeps spreading across shapes before taking a second from one", () => {
    const candidates = [
      item("a1", "t1", "1"),
      item("a2", "t1", "2"),
      item("b1", "t2", "3"),
    ];
    const picked = drawSpreadByShape(candidates, 2, seededRng(3));
    expect(new Set(picked.map((i) => i.template_id)).size).toBe(2);
  });
});

describe("answerVarietyKey compares answers, not shapes", () => {
  it("reads a widget spec through a key order that cannot vary", () => {
    const left = {
      answer: { interactive_spec: { kind: "rational_power", base: "x", num: 3, den: 4 } },
    } as unknown as FrozenItem;
    const right = {
      answer: { interactive_spec: { den: 4, num: 3, base: "x", kind: "rational_power" } },
    } as unknown as FrozenItem;
    expect(answerVarietyKey(left)).toBe(answerVarietyKey(right));
  });

  it("falls back to the item id when there is no answer to compare", () => {
    const bare = { item_version_id: "solo", answer: {} } as unknown as FrozenItem;
    expect(answerVarietyKey(bare)).toBe("u:solo");
  });
});
