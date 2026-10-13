import { createD1AnswerChecker, D1_CHECKER_VERSION } from "@cr/components";
import { describe, expect, it } from "vitest";

import { createItemBank, toD1ItemVersions } from "./bank";
import {
  buildD1PracticePool,
  buildRandomizedD1PracticeSet,
  D1_ITEM_PACK,
  D1_PRACTICE_ITEMS,
  D1_PRACTICE_MIX,
  D1_PRACTICE_NODES,
  D1_PRACTICE_POOL,
  D1_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D1_PRACTICE_TEMPLATES,
  D1_PRACTICE_VARIANTS,
  drawD1PracticeInstance,
  getD1PracticeSet,
} from "./d1";
import { expressionVariable } from "./promptFormat";
import { hashItemDefinition } from "./schema";
import { validateItemBank, validatePracticePool, validateTemplates } from "./validate";

const SLOTS_PER_NODE = D1_PRACTICE_MIX.reduce((sum, cell) => sum + cell.count, 0);

describe("D1 practice pool composition", () => {
  it("freezes a 1×L1/2×L2/2×L3 five-slot set for every node", () => {
    expect(SLOTS_PER_NODE).toBe(5);
    expect(D1_PRACTICE_POOL.length).toBe(D1_PRACTICE_NODES.length * SLOTS_PER_NODE);

    for (const node of D1_PRACTICE_NODES) {
      for (const { difficulty, count } of D1_PRACTICE_MIX) {
        const actual = D1_PRACTICE_POOL.filter(
          (item) => item.node_id === node && item.difficulty === difficulty,
        ).length;
        expect(actual, `${node} L${difficulty}`).toBe(count);
      }
    }
  });

  it("tags every item as practice with a unique id and distinct content", () => {
    expect(D1_PRACTICE_POOL.every((item) => item.form === "practice")).toBe(true);

    const ids = D1_PRACTICE_POOL.map((item) => item.item_version_id);
    expect(new Set(ids).size).toBe(D1_PRACTICE_POOL.length);

    const hashes = D1_PRACTICE_POOL.map(hashItemDefinition);
    expect(new Set(hashes).size).toBe(D1_PRACTICE_POOL.length);
  });
});

describe("D1 practice pool validation", () => {
  it("passes validatePracticePool (keys correct, composition, distinctness)", () => {
    expect(
      validatePracticePool(D1_PRACTICE_POOL, {
        nodes: D1_PRACTICE_NODES,
        mix: D1_PRACTICE_MIX,
      }),
    ).toEqual([]);
  });

  it("passes validateItemBank combined with the assessment pack (no reuse)", () => {
    expect(validateItemBank([...D1_ITEM_PACK, ...D1_PRACTICE_POOL])).toEqual([]);
  });

  it("shares no content with the assessment pool", () => {
    const assessment = new Set(D1_ITEM_PACK.map(hashItemDefinition));
    const overlap = D1_PRACTICE_POOL.map(hashItemDefinition).filter((hash) =>
      assessment.has(hash),
    );
    expect(overlap).toEqual([]);
  });

  it("stress-checks the full practice template grid through the real checker", () => {
    // 30 samples across each of the 34 templates covering the 18-cell grid.
    // The expression-answer shapes under NUM.3 and NUM.4 run the symbolic checker and
    // cost ~170ms each, so this call sits near 4.6s and needs a budget above the 5s
    // default; it is throughput, not a hang.
    expect(validateTemplates(D1_PRACTICE_TEMPLATES, 30)).toEqual([]);
  }, 60_000);

  it("catches a broken composition (dropped slot)", () => {
    const short = D1_PRACTICE_POOL.slice(1);
    const issues = validatePracticePool(short, {
      nodes: D1_PRACTICE_NODES,
      mix: D1_PRACTICE_MIX,
    });
    expect(issues.some((issue) => issue.code === "practice_composition_mismatch")).toBe(
      true,
    );
  });

  it("catches an assessment item smuggled into the pool", () => {
    const first = D1_ITEM_PACK[0];
    if (!first) {
      throw new Error("assessment pack is empty");
    }
    const issues = validatePracticePool([...D1_PRACTICE_POOL, first], {
      nodes: D1_PRACTICE_NODES,
      mix: D1_PRACTICE_MIX,
    });
    expect(issues.some((issue) => issue.code === "not_a_practice_item")).toBe(true);
  });
});

describe("D1 practice pool wiring", () => {
  it("is frozen deterministically (rebuild is identical)", () => {
    const rebuilt = buildD1PracticePool(D1_ITEM_PACK.map(hashItemDefinition));
    expect(rebuilt).toEqual([...D1_PRACTICE_POOL]);
  });

  it("is never served by the diagnostic item bank", () => {
    // createItemBank skips `practice`; a bank over ONLY practice items serves none.
    const bank = createItemBank(D1_PRACTICE_POOL);
    expect(() => bank.selectItem({ node_id: "NUM.2", difficulty: 2 }, "A")).toThrowError();
  });
});

describe("D1 practice retry variants", () => {
  const checker = createD1AnswerChecker({
    itemVersions: toD1ItemVersions(D1_PRACTICE_ITEMS),
  });
  const gradeKey = (item: (typeof D1_PRACTICE_ITEMS)[number]) =>
    checker({
      raw_answer: item.answer.answer_key,
      item_version_id: item.item_version_id,
      equivalence_checker_version: D1_CHECKER_VERSION,
    }).status;

  it("pre-generates distinct variants, disjoint from the pack and the pool", () => {
    const ids = D1_PRACTICE_VARIANTS.map((i) => i.item_version_id);
    expect(new Set(ids).size).toBe(D1_PRACTICE_VARIANTS.length);

    const variantHashes = D1_PRACTICE_VARIANTS.map(hashItemDefinition);
    expect(new Set(variantHashes).size).toBe(D1_PRACTICE_VARIANTS.length);

    const served = new Set([...D1_ITEM_PACK, ...D1_PRACTICE_POOL].map(hashItemDefinition));
    expect(variantHashes.filter((hash) => served.has(hash))).toEqual([]);
  });

  it("caps each shape at the per-cell budget (fewer for tiny param spaces)", () => {
    // A cell can now hold more than one template (shape); variants are built per
    // template, so the budget is enforced per `template_id`, not per (node,difficulty).
    for (const template of D1_PRACTICE_TEMPLATES) {
      const count = D1_PRACTICE_VARIANTS.filter(
        (i) => i.template_id === template.template_id,
      ).length;
      const cell = template.template_id;
      expect(count, cell).toBeGreaterThanOrEqual(1);
      expect(count, cell).toBeLessThanOrEqual(D1_PRACTICE_RETRY_VARIANTS_PER_CELL);
    }
  });

  it("keeps every variant gradable (registered set grades its key correct)", () => {
    for (const item of D1_PRACTICE_VARIANTS) {
      expect(gradeKey(item), item.item_version_id).toBe("correct");
    }
  });

  it("exposes a unique pool + variants union to register with the checker", () => {
    expect(D1_PRACTICE_ITEMS.length).toBe(
      D1_PRACTICE_POOL.length + D1_PRACTICE_VARIANTS.length,
    );
    const ids = D1_PRACTICE_ITEMS.map((i) => i.item_version_id);
    expect(new Set(ids).size).toBe(D1_PRACTICE_ITEMS.length);
    const hashes = D1_PRACTICE_ITEMS.map(hashItemDefinition);
    expect(new Set(hashes).size).toBe(D1_PRACTICE_ITEMS.length);
  });
});

/**
 * NUM.3 L3 is an EXPAND-only item: collecting like terms is NUM.4 material, and the
 * template's advisor note tells the learner so ("you can leave the variable terms
 * uncombined"). These cases grade real served instances through the real D1 checker,
 * so the advisor copy and the grader cannot drift apart again.
 */
describe("d1.num-3.l3 expand-only grading (end to end)", () => {
  const checker = createD1AnswerChecker({
    itemVersions: toD1ItemVersions(D1_PRACTICE_ITEMS),
  });
  const grade = (item: (typeof D1_PRACTICE_ITEMS)[number], rawAnswer: string) =>
    checker({
      raw_answer: rawAnswer,
      item_version_id: item.item_version_id,
      equivalence_checker_version: D1_CHECKER_VERSION,
    });

  /** Every served instance (canonical slot or retry variant) of the expand-only shape. */
  const instances = D1_PRACTICE_ITEMS.filter((i) => i.template_id === "d1.num-3.l3");

  /** `a(v + b) + c(v + d)`, whose key is `(a+c)v + (ab+cd)`. */
  const shapeOf = (item: (typeof D1_PRACTICE_ITEMS)[number]) => {
    const { a = 0, b = 0, c = 0, d = 0, varIndex = 0 } = item.template_params;
    return { a, b, c, d, v: expressionVariable(varIndex), constant: a * b + c * d };
  };

  it("serves instances, every one on the combined_constants profile", () => {
    expect(instances.length).toBeGreaterThan(0);
    for (const item of instances) {
      expect(item.answer.answer_spec.simplification, item.item_version_id).toBe(
        "combined_constants",
      );
    }
  });

  it("accepts uncombined variable terms — the answer the advisor line asks for", () => {
    for (const item of instances) {
      const { a, c, v, constant } = shapeOf(item);
      const raw = `${a}${v} + ${c}${v} + ${constant}`;
      expect(grade(item, raw).status, `${item.item_version_id}: ${raw}`).toBe("correct");
    }
  });

  it("still accepts the fully combined key", () => {
    for (const item of instances) {
      const { a, c, v, constant } = shapeOf(item);
      const raw = `${a + c}${v} + ${constant}`;
      expect(grade(item, raw).status, `${item.item_version_id}: ${raw}`).toBe("correct");
    }
  });

  it("rejects uncombined CONSTANTS (the part NUM.3 does require)", () => {
    for (const item of instances) {
      const { a, b, c, d, v } = shapeOf(item);
      const raw = `${a}${v} + ${a * b} + ${c}${v} + ${c * d}`;
      const result = grade(item, raw);
      expect(result.status, `${item.item_version_id}: ${raw}`).toBe("incorrect");
      expect(result.reason_code, `${item.item_version_id}: ${raw}`).toBe("not_simplified");
    }
  });

  it("rejects an unexpanded product (a copy of the prompt)", () => {
    for (const item of instances) {
      const { a, b, c, d, v } = shapeOf(item);
      const raw = `${a}(${v} + ${b}) + ${c}(${v} + ${d})`;
      const result = grade(item, raw);
      expect(result.status, `${item.item_version_id}: ${raw}`).toBe("incorrect");
      expect(result.reason_code, `${item.item_version_id}: ${raw}`).toBe("not_simplified");
    }
  });

  it("never accepts a non-equivalent answer (the profile widens FORM, not value)", () => {
    for (const item of instances) {
      const { a, c, v, constant } = shapeOf(item);
      const raw = `${a}${v} + ${c}${v} + ${constant - 2}`;
      const result = grade(item, raw);
      expect(result.status, `${item.item_version_id}: ${raw}`).toBe("incorrect");
      expect(result.reason_code, `${item.item_version_id}: ${raw}`).toBe("value_mismatch");
    }
  });
});

describe("drawD1PracticeInstance", () => {
  it("draws a fresh, gradable instance for the requested cell", () => {
    const drawn = drawD1PracticeInstance("NUM.2", 2);
    expect(drawn?.node_id).toBe("NUM.2");
    expect(drawn?.difficulty).toBe(2);
    expect(D1_PRACTICE_ITEMS).toContain(drawn);
  });

  it("respects `avoid` and never returns the avoided id or prompt", () => {
    const first = drawD1PracticeInstance("NUM.S", 3);
    expect(first).toBeDefined();
    // Same avoid -> same result.
    expect(drawD1PracticeInstance("NUM.S", 3)).toBe(first);
    // Avoiding the first returns a different instance with a different prompt.
    const second = drawD1PracticeInstance("NUM.S", 3, {
      avoid: [first?.item_version_id ?? ""],
    });
    expect(second?.item_version_id).not.toBe(first?.item_version_id);
    expect(second?.prompt).not.toBe(first?.prompt);
  });

  it("can draw an unused pool sibling after the cell's variants are avoided", () => {
    const variantIds = D1_PRACTICE_VARIANTS.filter(
      (item) => item.node_id === "NUM.2" && item.difficulty === 2,
    ).map((item) => item.item_version_id);
    const poolSiblings = D1_PRACTICE_POOL.filter(
      (item) => item.node_id === "NUM.2" && item.difficulty === 2,
    );
    expect(poolSiblings.length).toBeGreaterThan(0);

    const drawn = drawD1PracticeInstance("NUM.2", 2, { avoid: variantIds });
    expect(drawn).toBeDefined();
    expect(variantIds).not.toContain(drawn?.item_version_id);
    expect(
      poolSiblings.some((item) => item.item_version_id === drawn?.item_version_id),
    ).toBe(true);
  });

  it("returns undefined once a cell is exhausted", () => {
    const allIds = D1_PRACTICE_ITEMS.filter(
      (i) => i.node_id === "NUM.2" && i.difficulty === 2,
    ).map((i) => i.item_version_id);
    expect(drawD1PracticeInstance("NUM.2", 2, { avoid: allIds })).toBeUndefined();
  });
});

describe("getD1PracticeSet", () => {
  it("returns the canonical five-slot set per node", () => {
    for (const node of D1_PRACTICE_NODES) {
      const set = getD1PracticeSet(node);
      expect(set.length).toBe(5);
      expect(set.every((i) => i.node_id === node)).toBe(true);
    }
  });
});

describe("buildRandomizedD1PracticeSet", () => {
  const registeredIds = new Set(D1_PRACTICE_ITEMS.map((i) => i.item_version_id));

  it("keeps the locked mix, node, order, gradability, and in-set distinctness", () => {
    for (const node of D1_PRACTICE_NODES) {
      const set = buildRandomizedD1PracticeSet(node);
      expect(set.length).toBe(SLOTS_PER_NODE);
      expect(set.every((i) => i.node_id === node)).toBe(true);

      // Every drawn instance is registered with the checker (pool ∪ variants).
      expect(set.every((i) => registeredIds.has(i.item_version_id))).toBe(true);

      // Distinct instances within the set.
      expect(new Set(set.map((i) => i.item_version_id)).size).toBe(set.length);

      // Same per-difficulty counts as D1_PRACTICE_MIX, in easy→hard slot order.
      for (const { difficulty, count } of D1_PRACTICE_MIX) {
        expect(set.filter((i) => i.difficulty === difficulty).length).toBe(count);
      }
      const difficulties = set.map((i) => i.difficulty);
      expect(difficulties).toEqual([...difficulties].sort((a, b) => a - b));
    }
  });

  it("varies the opening instance run to run (not a fixed five)", () => {
    // NUM.2 L2 has the canonical pool plus retry variants, so repeated draws must
    // surface more than one distinct instance for that cell.
    const seen = new Set<string>();
    for (let run = 0; run < 50; run += 1) {
      for (const item of buildRandomizedD1PracticeSet("NUM.2")) {
        if (item.difficulty === 2) {
          seen.add(item.item_version_id);
        }
      }
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("is deterministic for a seeded rng", () => {
    const seededRng = () => 0; // always picks the same shuffle path
    const a = buildRandomizedD1PracticeSet("NUM.F", seededRng);
    const b = buildRandomizedD1PracticeSet("NUM.F", seededRng);
    expect(a.map((i) => i.item_version_id)).toEqual(b.map((i) => i.item_version_id));
  });
});
