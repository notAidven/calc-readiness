import { describe, expect, it } from "vitest";

import { D1_ITEM_PACK, D1_PRACTICE_ITEMS, D1_WALK_ITEM_PACK } from "./d1";
import { D2_PRACTICE_ITEMS } from "./d2";
import { D5_PRACTICE_ITEMS } from "./d5";
import {
  buildRandomizedD7PracticeSet,
  D7_PRACTICE_ITEMS,
  D7_PRACTICE_MIX,
  D7_PRACTICE_NODES,
  D7_PRACTICE_POOL,
  D7_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D7_PRACTICE_TEMPLATES,
  D7_PRACTICE_VARIANTS,
  LF1_TEMPLATES,
  LF2_TEMPLATES,
  LF3_TEMPLATES,
  LF4_TEMPLATES,
} from "./index";
import { INTERACTIVE_PRACTICE_ITEMS } from "./interactive/practice";
import { PRODUCT_ITEM_PACK } from "./product";
import { hashItemDefinition } from "./schema";
import type { FrozenItem, ItemTemplate } from "./template";
import {
  PRODUCT_CHECKER_CONFIG,
  validatePracticePool,
  validateTemplates,
} from "./validate";

/**
 * The D7 (Linear Functions) practice pool, all four authored nodes. It pins the five-slot
 * pool per node and proves the pool self-validates through the v2 PRODUCT checker, composes
 * the locked five-slot mix, reshuffles without repeating a problem SHAPE, and is fully
 * isolated from every other pool, including the already-frozen LF.1 product ASSESSMENT
 * item (`prod.lf-1.l2`), which this slice never touches.
 *
 * The D7-specific invariant is that a node answers in the type its QUESTION calls for
 * rather than in one house form, which is what keeps the domain gradable without a new
 * checker path. A slope or a prediction is numeric; a line or a model is asked for as the
 * right-hand side of `y = ...` and graded as an expression, because general two-sided
 * equation equivalence is not a cleared category; a system's solution is a point; and the
 * classify families answer with a word. That spread is asserted directly below, so a node
 * that quietly drifted into an ungradable answer type fails here rather than in the UI.
 */

/** The answer types each node is allowed to serve. */
const NODE_ANSWER_TYPES: Readonly<Record<string, readonly string[]>> = {
  "LF.1": ["numeric", "multiple_choice"],
  "LF.2": ["expression", "numeric", "multiple_choice"],
  "LF.3": ["expression", "numeric"],
  "LF.4": ["point", "numeric", "multiple_choice"],
};

/** Every D7 template, so a sweep cannot silently skip a node. */
const ALL_D7_TEMPLATES: readonly ItemTemplate[] = D7_PRACTICE_TEMPLATES;

describe("D7 practice templates (Linear Functions)", () => {
  it("authors every node's templates under its real node id with d7 ids", () => {
    const byNode: readonly (readonly [string, readonly ItemTemplate[], string])[] = [
      ["LF.1", LF1_TEMPLATES, "d7.lf1."],
      ["LF.2", LF2_TEMPLATES, "d7.lf2."],
      ["LF.3", LF3_TEMPLATES, "d7.lf3."],
      ["LF.4", LF4_TEMPLATES, "d7.lf4."],
    ];
    for (const [nodeId, templates, prefix] of byNode) {
      expect(templates.length, nodeId).toBeGreaterThanOrEqual(5);
      for (const template of templates) {
        expect(template.node_id, template.template_id).toBe(nodeId);
        expect(template.template_id.startsWith(prefix), template.template_id).toBe(true);
      }
    }
    expect(ALL_D7_TEMPLATES).toHaveLength(
      LF1_TEMPLATES.length +
        LF2_TEMPLATES.length +
        LF3_TEMPLATES.length +
        LF4_TEMPLATES.length,
    );
  });

  it("composes the locked 1xL1 / 2xL2 / 2xL3 mix from distinct shapes at each level", () => {
    for (const [nodeId, templates] of [
      ["LF.1", LF1_TEMPLATES],
      ["LF.2", LF2_TEMPLATES],
      ["LF.3", LF3_TEMPLATES],
      ["LF.4", LF4_TEMPLATES],
    ] as const) {
      for (const [difficulty, expected] of [
        [1, 1],
        [2, 2],
        [3, 2],
      ] as const) {
        const atLevel = templates.filter((t) => t.difficulty === difficulty);
        expect(atLevel.length, `${nodeId} L${difficulty}`).toBe(expected);
        // Two slots must be fillable by two genuinely different problem shapes.
        expect(
          new Set(atLevel.map((t) => t.template_id)).size,
          `${nodeId} L${difficulty}`,
        ).toBe(expected);
      }
    }
  });

  // Symbolic expression equivalence runs through mathjs and costs far more per item than a
  // plain numeric compare, so these three sweeps need more than vitest's 5s default (see
  // d5.test.ts and product.test.ts, which budget the same way).
  it("every sampled instance of EVERY template self-validates through the v2 product checker", () => {
    expect(validateTemplates(ALL_D7_TEMPLATES, 40, PRODUCT_CHECKER_CONFIG)).toEqual([]);
  }, 60_000);

  it("the frozen practice pool composes the five-slot mix and self-validates", () => {
    expect(
      validatePracticePool(
        D7_PRACTICE_POOL,
        { nodes: D7_PRACTICE_NODES, mix: D7_PRACTICE_MIX },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  }, 60_000);

  /**
   * The reveal-to-retry variants are the instances a learner reaches by revealing a slot,
   * and there are roughly six times as many of them as there are pool items. Composition is
   * skipped (variants are not a five-slot mix); every other pool invariant applies.
   */
  it("every retry variant is a distinct, gradable practice item too", () => {
    expect(D7_PRACTICE_VARIANTS.length).toBeGreaterThan(D7_PRACTICE_POOL.length);
    expect(
      validatePracticePool(
        D7_PRACTICE_VARIANTS,
        { nodes: [], mix: [] },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  }, 60_000);
});

/**
 * What each node is allowed to ask for. An unscoped assertion would be meaningless here,
 * because the four nodes deliberately answer in four different types; pinning the allowed
 * set per node is what catches a shape that drifted into a type the checker cannot grade.
 */
describe("D7 answers stay in the types their questions call for", () => {
  it("serves each node only its allowed answer types", () => {
    for (const [nodeId, allowed] of Object.entries(NODE_ANSWER_TYPES)) {
      const items = D7_PRACTICE_ITEMS.filter((item) => item.node_id === nodeId);
      expect(items.length, nodeId).toBeGreaterThan(0);
      for (const item of items) {
        expect(allowed, item.item_version_id).toContain(
          item.answer.answer_spec.answer_type,
        );
      }
    }
  });

  /**
   * An expression answer is graded symbolically against the symbols it declares, so a
   * template that forgot `allowed_symbols` would grade a perfectly good `2x + 5` as a
   * parse error the moment a learner typed the variable.
   */
  it("declares allowed symbols on every expression answer", () => {
    const expressions = D7_PRACTICE_ITEMS.filter(
      (item) => item.answer.answer_spec.answer_type === "expression",
    );
    expect(expressions.length).toBeGreaterThan(0);
    for (const item of expressions) {
      expect(
        item.answer.allowed_symbols?.length ?? 0,
        item.item_version_id,
      ).toBeGreaterThan(0);
    }
  });
});

/**
 * The variety guard. Every D7 template declares a `varietyKey` over its answer, and both
 * freezers honour it: content-hash distinctness alone would let two instances that reduce
 * to the same thing sit in one cell.
 */
describe("D7 variety guard (a cell never holds two instances with the same answer)", () => {
  const templateById = new Map(ALL_D7_TEMPLATES.map((t) => [t.template_id, t]));

  function varietyOf(item: FrozenItem): string | undefined {
    return templateById.get(item.template_id)?.varietyKey?.(item.template_params);
  }

  it("declares a varietyKey on every template", () => {
    for (const template of ALL_D7_TEMPLATES) {
      expect(typeof template.varietyKey, template.template_id).toBe("function");
    }
  });

  it("gives every item in a (node, difficulty) cell a distinct variety key", () => {
    const byCell = new Map<string, string[]>();
    for (const item of D7_PRACTICE_POOL) {
      const variety = varietyOf(item);
      expect(variety, item.item_version_id).toBeDefined();
      const key = `${item.node_id}:L${item.difficulty}`;
      byCell.set(key, [...(byCell.get(key) ?? []), variety as string]);
    }
    for (const [cell, varieties] of byCell) {
      expect(new Set(varieties).size, cell).toBe(varieties.length);
    }
  });

  it("gives every retry variant of one template a distinct variety key", () => {
    const byTemplate = new Map<string, string[]>();
    for (const item of D7_PRACTICE_VARIANTS) {
      const variety = varietyOf(item);
      expect(variety, item.item_version_id).toBeDefined();
      byTemplate.set(item.template_id, [
        ...(byTemplate.get(item.template_id) ?? []),
        variety as string,
      ]);
    }
    for (const [templateId, varieties] of byTemplate) {
      expect(new Set(varieties).size, templateId).toBe(varieties.length);
    }
  });

  /**
   * The guard can only be satisfied by a template whose parameter space is big enough: a
   * shorter case list makes `buildVariants` give up after 200 misses and under-deliver
   * without saying so, which is how a cell quietly loses its retry depth.
   */
  it("delivers the full retry depth for every template (no silent shortfall)", () => {
    for (const template of ALL_D7_TEMPLATES) {
      const made = D7_PRACTICE_VARIANTS.filter(
        (item) => item.template_id === template.template_id,
      ).length;
      expect(made, template.template_id).toBe(D7_PRACTICE_RETRY_VARIANTS_PER_CELL);
    }
  });
});

describe("D7 practice set (reshuffle without repeating a shape)", () => {
  const seededRng = () => {
    let seed = 1;
    return () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };
  };

  it("draws a distinct five-slot set in the locked easy-to-hard mix, for every node", () => {
    const rng = seededRng();
    for (const node of D7_PRACTICE_NODES) {
      for (let run = 0; run < 8; run += 1) {
        const set = buildRandomizedD7PracticeSet(node, rng);
        expect(set, node).toHaveLength(5);
        expect(new Set(set.map((item) => item.item_version_id)).size, node).toBe(5);
        expect(
          set.map((item) => item.difficulty),
          node,
        ).toEqual([1, 2, 2, 3, 3]);
        expect(
          set.every((item) => item.node_id === node),
          node,
        ).toBe(true);
      }
    }
  });

  it("never serves one problem shape twice in a cell that has more than one", () => {
    const rng = seededRng();
    for (const node of D7_PRACTICE_NODES) {
      for (let run = 0; run < 30; run += 1) {
        const set = buildRandomizedD7PracticeSet(node, rng);
        for (const { difficulty } of D7_PRACTICE_MIX) {
          const slots = set.filter((item) => item.difficulty === difficulty);
          const shapesAvailable = new Set(
            D7_PRACTICE_ITEMS.filter(
              (item) => item.node_id === node && item.difficulty === difficulty,
            ).map((item) => item.template_id),
          ).size;
          const shapesServed = new Set(slots.map((item) => item.template_id)).size;
          expect(shapesServed, `${node} L${difficulty}`).toBe(
            Math.min(slots.length, shapesAvailable),
          );
        }
      }
    }
  });

  it("still varies which instance fills a slot run to run", () => {
    const rng = seededRng();
    const seen = new Set<string>();
    for (let run = 0; run < 40; run += 1) {
      for (const item of buildRandomizedD7PracticeSet("LF.1", rng)) {
        seen.add(item.item_version_id);
      }
    }
    expect(seen.size).toBeGreaterThan(5);
  });
});

describe("D7 pool isolation (never touches the frozen LF.1 assessment or any other pool)", () => {
  it("shares no id or content with any D1 / D2 / D5 / product / interactive pool", () => {
    const others = [
      ...D1_ITEM_PACK,
      ...D1_PRACTICE_ITEMS,
      ...D1_WALK_ITEM_PACK,
      ...D2_PRACTICE_ITEMS,
      ...D5_PRACTICE_ITEMS,
      ...PRODUCT_ITEM_PACK,
      ...INTERACTIVE_PRACTICE_ITEMS,
    ];
    const otherIds = new Set(others.map((item) => item.item_version_id));
    const otherHashes = new Set(others.map(hashItemDefinition));
    for (const item of D7_PRACTICE_ITEMS) {
      expect(otherIds.has(item.item_version_id), item.item_version_id).toBe(false);
      expect(otherHashes.has(hashItemDefinition(item)), item.item_version_id).toBe(false);
    }
  });

  it("shares no template id with the frozen LF.1 product assessment", () => {
    const productTemplateIds = new Set(PRODUCT_ITEM_PACK.map((item) => item.template_id));
    for (const template of ALL_D7_TEMPLATES) {
      expect(productTemplateIds.has(template.template_id), template.template_id).toBe(
        false,
      );
    }
  });
});

describe("D7 pool content pin (a template edit that changes the pool must be explicit)", () => {
  it("pins the frozen D7 practice pool ids + content hashes", () => {
    const snapshot = D7_PRACTICE_POOL.map((item) => ({
      id: item.item_version_id,
      node: item.node_id,
      difficulty: item.difficulty,
      hash: hashItemDefinition(item),
    }));
    expect(snapshot).toMatchSnapshot();
  });
});
