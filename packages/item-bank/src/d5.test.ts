import { describe, expect, it } from "vitest";

import { D1_ITEM_PACK, D1_PRACTICE_ITEMS, D1_WALK_ITEM_PACK } from "./d1";
import { D2_PRACTICE_ITEMS } from "./d2";
import {
  buildRandomizedD5PracticeSet,
  D5_PRACTICE_ITEMS,
  D5_PRACTICE_MIX,
  D5_PRACTICE_NODES,
  D5_PRACTICE_POOL,
  D5_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D5_PRACTICE_TEMPLATES,
  D5_PRACTICE_VARIANTS,
  RAT1_TEMPLATES,
  RAT2_TEMPLATES,
  RAT3_TEMPLATES,
  RAT4_TEMPLATES,
  RAT5_TEMPLATES,
  RAT6_TEMPLATES,
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
 * The D5 ("Verdigris Hold", the crafting-guild island) practice pool, all six authored
 * nodes. It pins the five-slot pool per node and proves the pool self-validates through the
 * v2 PRODUCT checker, composes the locked five-slot mix, reshuffles without repeating a
 * problem SHAPE, and is fully isolated from every other pool, including the already-frozen
 * RAT.1 product ASSESSMENT item, which this slice never touches.
 *
 * The D5-specific invariant is the excluded-value set: a rational answer is graded on BOTH
 * the expression and the values its ORIGINAL denominator forbids, so a shape that cancels a
 * factor and quietly drops the value that factor excluded is wrong even though the
 * expression matches. That is asserted directly below rather than left to the checker.
 *
 * It applies to the four EXPRESSION nodes (RAT.1 to RAT.4), which is why the assertion is
 * scoped rather than swept over the whole pool. The two analysis nodes are asked for
 * something other than an expression, so they answer in their own types: RAT.5 gives a
 * domain in set-builder notation, an asymptote value, or a hole as a point, and RAT.6 gives
 * the solution set that survives the extraneous-root check.
 */

/** The nodes whose answer IS a rational expression, and so carries excluded values. */
const EXPRESSION_NODES: ReadonlySet<string> = new Set(["RAT.1", "RAT.2", "RAT.3", "RAT.4"]);

/** The answer types each analysis node is allowed to serve. */
const ANALYSIS_ANSWER_TYPES: Readonly<Record<string, readonly string[]>> = {
  "RAT.5": ["interval", "numeric", "point"],
  "RAT.6": ["solution_set"],
};

/** Every D5 template, so a sweep cannot silently skip a node. */
const ALL_D5_TEMPLATES: readonly ItemTemplate[] = D5_PRACTICE_TEMPLATES;

describe("D5 practice templates (Verdigris Hold)", () => {
  it("authors every node's templates under its real node id with d5 ids", () => {
    const byNode: readonly (readonly [string, readonly ItemTemplate[], string])[] = [
      ["RAT.1", RAT1_TEMPLATES, "d5.rat1."],
      ["RAT.2", RAT2_TEMPLATES, "d5.rat2."],
      ["RAT.3", RAT3_TEMPLATES, "d5.rat3."],
      ["RAT.4", RAT4_TEMPLATES, "d5.rat4."],
      ["RAT.5", RAT5_TEMPLATES, "d5.rat5."],
      ["RAT.6", RAT6_TEMPLATES, "d5.rat6."],
    ];
    for (const [nodeId, templates, prefix] of byNode) {
      expect(templates.length, nodeId).toBeGreaterThanOrEqual(5);
      for (const template of templates) {
        expect(template.node_id, template.template_id).toBe(nodeId);
        expect(template.template_id.startsWith(prefix), template.template_id).toBe(true);
      }
    }
    expect(ALL_D5_TEMPLATES).toHaveLength(
      RAT1_TEMPLATES.length +
        RAT2_TEMPLATES.length +
        RAT3_TEMPLATES.length +
        RAT4_TEMPLATES.length +
        RAT5_TEMPLATES.length +
        RAT6_TEMPLATES.length,
    );
  });

  it("composes the locked 1xL1 / 2xL2 / 2xL3 mix from distinct shapes at each level", () => {
    for (const [nodeId, templates] of [
      ["RAT.1", RAT1_TEMPLATES],
      ["RAT.2", RAT2_TEMPLATES],
      ["RAT.3", RAT3_TEMPLATES],
      ["RAT.4", RAT4_TEMPLATES],
      ["RAT.5", RAT5_TEMPLATES],
      ["RAT.6", RAT6_TEMPLATES],
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

  // D5 grades on the `rational_answer` path, whose symbolic-denominator comparison runs
  // through mathjs and costs far more per item than D2's radical checks, so this sweep
  // needs more than vitest's 5s default (see product.test.ts, which does the same).
  it("every sampled instance of EVERY template self-validates through the v2 product checker", () => {
    expect(validateTemplates(ALL_D5_TEMPLATES, 40, PRODUCT_CHECKER_CONFIG)).toEqual([]);
  }, 60_000);

  it("the frozen practice pool composes the five-slot mix and self-validates", () => {
    expect(
      validatePracticePool(
        D5_PRACTICE_POOL,
        { nodes: D5_PRACTICE_NODES, mix: D5_PRACTICE_MIX },
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
    expect(D5_PRACTICE_VARIANTS.length).toBeGreaterThan(D5_PRACTICE_POOL.length);
    expect(
      validatePracticePool(
        D5_PRACTICE_VARIANTS,
        { nodes: [], mix: [] },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  }, 60_000);
});

/**
 * The domain-tracking invariant, and the reason D5 grades on `rational_answer` rather than
 * a plain expression match. Cancelling a factor changes what the expression looks like but
 * NOT what the original denominator forbade, so every served instance has to carry its
 * exclusions with it.
 */
describe("D5 rational answers carry their excluded values", () => {
  const expressionItems = D5_PRACTICE_ITEMS.filter((item) =>
    EXPRESSION_NODES.has(item.node_id),
  );

  it("grades every served expression instance on the rational_answer path", () => {
    expect(expressionItems.length).toBeGreaterThan(0);
    for (const item of expressionItems) {
      expect(item.answer.answer_spec.answer_type, item.item_version_id).toBe(
        "rational_answer",
      );
    }
  });

  it("declares a non-empty excluded-value set on every served expression instance", () => {
    for (const item of expressionItems) {
      const excluded = item.answer.excluded_values;
      expect(Array.isArray(excluded), item.item_version_id).toBe(true);
      expect(excluded?.length ?? 0, item.item_version_id).toBeGreaterThan(0);
    }
  });

  it("never lists the same excluded value twice", () => {
    for (const item of expressionItems) {
      const excluded = item.answer.excluded_values ?? [];
      expect(new Set(excluded).size, item.item_version_id).toBe(excluded.length);
    }
  });

  /**
   * The analysis nodes are the reason the sweep above is scoped, so pin what they DO serve:
   * an unscoped `rational_answer` assertion would pass today only by accident, and a node
   * that quietly drifted to a free-text answer type would slip through unnoticed.
   */
  it("serves each analysis node only the answer types its questions call for", () => {
    for (const [nodeId, allowed] of Object.entries(ANALYSIS_ANSWER_TYPES)) {
      const items = D5_PRACTICE_ITEMS.filter((item) => item.node_id === nodeId);
      expect(items.length, nodeId).toBeGreaterThan(0);
      for (const item of items) {
        expect(allowed, item.item_version_id).toContain(
          item.answer.answer_spec.answer_type,
        );
      }
    }
  });
});

/**
 * The variety guard. Every D5 template declares a `varietyKey` over its simplified answer,
 * and both freezers honour it: content-hash distinctness alone would let two instances that
 * reduce to the same thing sit in one cell.
 */
describe("D5 variety guard (a cell never holds two instances with the same answer)", () => {
  const templateById = new Map(ALL_D5_TEMPLATES.map((t) => [t.template_id, t]));

  function varietyOf(item: FrozenItem): string | undefined {
    return templateById.get(item.template_id)?.varietyKey?.(item.template_params);
  }

  it("declares a varietyKey on every template", () => {
    for (const template of ALL_D5_TEMPLATES) {
      expect(typeof template.varietyKey, template.template_id).toBe("function");
    }
  });

  it("gives every item in a (node, difficulty) cell a distinct variety key", () => {
    const byCell = new Map<string, string[]>();
    for (const item of D5_PRACTICE_POOL) {
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
    for (const item of D5_PRACTICE_VARIANTS) {
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
    for (const template of ALL_D5_TEMPLATES) {
      const made = D5_PRACTICE_VARIANTS.filter(
        (item) => item.template_id === template.template_id,
      ).length;
      expect(made, template.template_id).toBe(D5_PRACTICE_RETRY_VARIANTS_PER_CELL);
    }
  });
});

describe("D5 practice set (reshuffle without repeating a shape)", () => {
  const seededRng = () => {
    let seed = 1;
    return () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };
  };

  it("draws a distinct five-slot set in the locked easy-to-hard mix, for every node", () => {
    const rng = seededRng();
    for (const node of D5_PRACTICE_NODES) {
      for (let run = 0; run < 8; run += 1) {
        const set = buildRandomizedD5PracticeSet(node, rng);
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
    for (const node of D5_PRACTICE_NODES) {
      for (let run = 0; run < 30; run += 1) {
        const set = buildRandomizedD5PracticeSet(node, rng);
        for (const { difficulty } of D5_PRACTICE_MIX) {
          const slots = set.filter((item) => item.difficulty === difficulty);
          const shapesAvailable = new Set(
            D5_PRACTICE_ITEMS.filter(
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
      for (const item of buildRandomizedD5PracticeSet("RAT.1", rng)) {
        seen.add(item.item_version_id);
      }
    }
    expect(seen.size).toBeGreaterThan(5);
  });
});

describe("D5 pool isolation (never touches the frozen RAT.1 assessment or any other pool)", () => {
  it("shares no id or content with any D1 / D2 / product / interactive pool", () => {
    const others = [
      ...D1_ITEM_PACK,
      ...D1_PRACTICE_ITEMS,
      ...D1_WALK_ITEM_PACK,
      ...D2_PRACTICE_ITEMS,
      ...PRODUCT_ITEM_PACK,
      ...INTERACTIVE_PRACTICE_ITEMS,
    ];
    const otherIds = new Set(others.map((item) => item.item_version_id));
    const otherHashes = new Set(others.map(hashItemDefinition));
    for (const item of D5_PRACTICE_ITEMS) {
      expect(otherIds.has(item.item_version_id), item.item_version_id).toBe(false);
      expect(otherHashes.has(hashItemDefinition(item)), item.item_version_id).toBe(false);
    }
  });

  it("shares no template id with the frozen RAT.1 product assessment", () => {
    const productTemplateIds = new Set(PRODUCT_ITEM_PACK.map((item) => item.template_id));
    for (const template of ALL_D5_TEMPLATES) {
      expect(productTemplateIds.has(template.template_id), template.template_id).toBe(
        false,
      );
    }
  });
});

describe("D5 pool content pin (a template edit that changes the pool must be explicit)", () => {
  it("pins the frozen D5 practice pool ids + content hashes", () => {
    const snapshot = D5_PRACTICE_POOL.map((item) => ({
      id: item.item_version_id,
      node: item.node_id,
      difficulty: item.difficulty,
      hash: hashItemDefinition(item),
    }));
    expect(snapshot).toMatchSnapshot();
  });
});
