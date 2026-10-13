import { describe, expect, it } from "vitest";

import { D1_ITEM_PACK, D1_PRACTICE_ITEMS, D1_WALK_ITEM_PACK } from "./d1";
import { D2_PRACTICE_ITEMS } from "./d2";
import { D5_PRACTICE_ITEMS } from "./d5";
import { D7_PRACTICE_ITEMS } from "./d7";
import {
  buildRandomizedD8PracticeSet,
  D8_EXTRA_PRACTICE_TEMPLATES,
  D8_PRACTICE_ITEMS,
  D8_PRACTICE_MIX,
  D8_PRACTICE_NODES,
  D8_PRACTICE_POOL,
  D8_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D8_PRACTICE_TEMPLATES,
  D8_PRACTICE_VARIANTS,
  EL1_TEMPLATES,
  EL2_TEMPLATES,
  EL3_TEMPLATES,
  EL4_TEMPLATES,
  EL5_TEMPLATES,
  EL6_TEMPLATES,
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
 * The D8 (Exponential & Logarithmic) practice pool. It pins the five-slot pool per node and
 * proves the pool self-validates through the v2 PRODUCT checker, composes the locked
 * five-slot mix, reshuffles without repeating a problem SHAPE, and is fully isolated from
 * every other pool, including the already-frozen EL.1 product ASSESSMENT item
 * (`prod.el-1.l2`), which this slice never touches.
 *
 * Two D8-specific invariants are asserted here rather than left to a reader's care:
 *
 *  - **Only EL.6 declares an exact solution roster.** `representation: "exact"` on a
 *    `solution_set` is the gate that admits `log` / `ln` / `sqrt` into a roster member, and
 *    the additivity of that 2026-07-30 checker change rests on no other item declaring it.
 *    The census below is the bank's half of the proof (the checker's half is
 *    `product-answer-checker.additive.test.ts`, which cannot see this package).
 *  - **Base $e$ answers carry a declared `precision`.** The checker has no `e` binding, so an
 *    exact `e` expression is not gradable and a continuous-growth answer has to be a rounded
 *    decimal. A shape that dropped the precision spec would start rejecting every learner
 *    who rounded, so the spec's presence is pinned per item.
 */

/** The answer types each node is allowed to serve. */
const NODE_ANSWER_TYPES: Readonly<Record<string, readonly string[]>> = {
  "EL.1": ["numeric", "multiple_choice"],
  "EL.2": ["numeric", "point", "expression", "multiple_choice"],
  "EL.3": ["numeric"],
  "EL.4": ["numeric", "interval", "point"],
  "EL.5": ["expression", "numeric"],
  "EL.6": ["numeric", "solution_set"],
};

/** Every D8 template, so a sweep cannot silently skip a node. */
const ALL_D8_TEMPLATES: readonly ItemTemplate[] = D8_PRACTICE_TEMPLATES;

describe("D8 practice templates (Exponential & Logarithmic)", () => {
  it("authors every node's templates under its real node id with d8 ids", () => {
    const byNode: readonly (readonly [string, readonly ItemTemplate[], string])[] = [
      ["EL.1", EL1_TEMPLATES, "d8.el1."],
      ["EL.2", EL2_TEMPLATES, "d8.el2."],
      ["EL.3", EL3_TEMPLATES, "d8.el3."],
      ["EL.4", EL4_TEMPLATES, "d8.el4."],
      ["EL.5", EL5_TEMPLATES, "d8.el5."],
      ["EL.6", EL6_TEMPLATES, "d8.el6."],
    ];
    for (const [nodeId, templates, prefix] of byNode) {
      expect(templates.length, nodeId).toBeGreaterThanOrEqual(5);
      for (const template of templates) {
        expect(template.node_id, template.template_id).toBe(nodeId);
        expect(template.template_id.startsWith(prefix), template.template_id).toBe(true);
      }
    }
    expect(ALL_D8_TEMPLATES).toHaveLength(
      EL1_TEMPLATES.length +
        EL2_TEMPLATES.length +
        EL3_TEMPLATES.length +
        EL4_TEMPLATES.length +
        EL5_TEMPLATES.length +
        EL6_TEMPLATES.length +
        D8_EXTRA_PRACTICE_TEMPLATES.length,
    );
  });

  /**
   * The extra shapes share a cell with a locked-mix template, so they are not covered by the
   * per-node sweep above, and the two properties that sweep enforces are exactly the two that
   * matter for them: a real node id, and an id under this domain's prefix. Both are asserted
   * here rather than by widening `byNode`, because widening it would fold them into
   * `EL3_TEMPLATES`'s locked-mix count and lose the distinction the split exists to keep.
   */
  it("holds every extra shape to the same ids, against a real node", () => {
    expect(D8_EXTRA_PRACTICE_TEMPLATES.length).toBeGreaterThan(0);
    for (const template of D8_EXTRA_PRACTICE_TEMPLATES) {
      expect(D8_PRACTICE_NODES, template.template_id).toContain(template.node_id);
      expect(template.template_id.startsWith("d8."), template.template_id).toBe(true);
    }
    // And they are APPENDED: every locked-mix template comes first, which is what keeps the
    // pool slots and the retry-variant seeds of everything already frozen where they were.
    const locked =
      EL1_TEMPLATES.length +
      EL2_TEMPLATES.length +
      EL3_TEMPLATES.length +
      EL4_TEMPLATES.length +
      EL5_TEMPLATES.length +
      EL6_TEMPLATES.length;
    expect(ALL_D8_TEMPLATES.slice(locked).map((t) => t.template_id)).toEqual(
      D8_EXTRA_PRACTICE_TEMPLATES.map((t) => t.template_id),
    );
  });

  /**
   * EL.6 was withheld until 2026-07-30 on `Answer_Equivalence_Spec.md` §10's deferral of
   * *arbitrary equation equivalence*. That category is reached by submitting AN EQUATION;
   * solving one submits its ROOTS, so this node answers in categories that were already
   * cleared, plus the exact solution roster added for its logarithmic-root shape.
   */
  it("authors all six nodes, EL.6 included", () => {
    expect(D8_PRACTICE_NODES).toContain("EL.6");
    expect(D8_PRACTICE_NODES).toHaveLength(6);
    expect(ALL_D8_TEMPLATES.filter((t) => t.node_id === "EL.6")).toHaveLength(5);
    // The registered nodes are exactly the ones with templates, so no node in the pool can
    // be missing a shape and no shape can belong to an unregistered node.
    expect([...D8_PRACTICE_NODES].sort()).toEqual(
      [...new Set(ALL_D8_TEMPLATES.map((t) => t.node_id))].sort(),
    );
  });

  it("composes the locked 1xL1 / 2xL2 / 2xL3 mix from distinct shapes at each level", () => {
    for (const [nodeId, templates] of [
      ["EL.1", EL1_TEMPLATES],
      ["EL.2", EL2_TEMPLATES],
      ["EL.3", EL3_TEMPLATES],
      ["EL.4", EL4_TEMPLATES],
      ["EL.5", EL5_TEMPLATES],
      ["EL.6", EL6_TEMPLATES],
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

  // Symbolic and precision compares run through mathjs and cost far more per item than a
  // plain numeric compare, so these sweeps need more than vitest's 5s default (see
  // d5.test.ts, d7.test.ts and product.test.ts, which budget the same way).
  it("every sampled instance of EVERY template self-validates through the v2 product checker", () => {
    expect(validateTemplates(ALL_D8_TEMPLATES, 40, PRODUCT_CHECKER_CONFIG)).toEqual([]);
  }, 60_000);

  it("the frozen practice pool composes the five-slot mix and self-validates", () => {
    expect(
      validatePracticePool(
        D8_PRACTICE_POOL,
        { nodes: D8_PRACTICE_NODES, mix: D8_PRACTICE_MIX },
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
    expect(D8_PRACTICE_VARIANTS.length).toBeGreaterThan(D8_PRACTICE_POOL.length);
    expect(
      validatePracticePool(
        D8_PRACTICE_VARIANTS,
        { nodes: [], mix: [] },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  }, 60_000);
});

describe("D8 answers stay in the types their questions call for", () => {
  it("serves each node only its allowed answer types", () => {
    for (const [nodeId, allowed] of Object.entries(NODE_ANSWER_TYPES)) {
      const items = D8_PRACTICE_ITEMS.filter((item) => item.node_id === nodeId);
      expect(items.length, nodeId).toBeGreaterThan(0);
      for (const item of items) {
        expect(allowed, item.item_version_id).toContain(
          item.answer.answer_spec.answer_type,
        );
      }
    }
  });

  /**
   * The base-$e$ and percent-growth shapes answer with a rounded decimal, so each one must
   * declare the precision it is rounded to. Without it the checker compares exact values and
   * every learner who rounded to the cent, exactly as asked, would be marked wrong.
   */
  it("declares a precision spec on every rounded-decimal answer", () => {
    const rounded = D8_PRACTICE_ITEMS.filter((item) =>
      [
        "d8.el1.percent-growth.l3",
        "d8.el1.continuous.l3",
        "d8.el5.change-base-value.l3",
      ].includes(item.template_id),
    );
    expect(rounded.length, "the rounded shapes are in the pool").toBeGreaterThan(0);
    for (const item of rounded) {
      const spec = item.answer.answer_spec;
      expect(spec.answer_type, item.item_version_id).toBe("numeric");
      const places = item.template_id === "d8.el5.change-base-value.l3" ? 3 : 2;
      expect(spec.precision, item.item_version_id).toEqual({
        mode: "decimal_places",
        value: places,
        rounding: "half_up",
      });
      expect(spec.representation, item.item_version_id).toBe("decimal");
    }
  });

  /**
   * Every EL.3 answer is one of the three numbers in `b^k = y`, so all of them are plain
   * values with no representation requirement. A shape that acquired one would be asking for
   * a FORM without a prompt that says so.
   */
  it("leaves every EL.3 answer representation-free", () => {
    const items = D8_PRACTICE_ITEMS.filter((item) => item.node_id === "EL.3");
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.answer.answer_spec.representation, item.item_version_id).toBe("any");
      expect(item.answer.answer_spec.precision, item.item_version_id).toBeNull();
    }
  });

  /**
   * The BANK-WIDE census behind the 2026-07-30 checker change. `representation: "exact"` on a
   * `solution_set` widens a roster member's grammar to `log` / `ln` / `sqrt`, and the claim
   * that the widening is additive rests on exactly one template declaring it. Swept over
   * every authored pool rather than over D8, because the risk is another domain's roster
   * acquiring the declaration and quietly changing how it grades.
   *
   * Asserted in both directions, so it fails whether a non-EL.6 item acquires the flag or
   * `d8.el6.exp-quadratic.l3` loses it. The floor under the plain rosters is what stops the
   * census passing over an empty population.
   */
  it("declares an exact solution roster on exactly one template, bank-wide", () => {
    const everyPool: readonly FrozenItem[] = [
      ...D1_ITEM_PACK,
      ...D1_PRACTICE_ITEMS,
      ...D1_WALK_ITEM_PACK,
      ...D2_PRACTICE_ITEMS,
      ...D5_PRACTICE_ITEMS,
      ...D7_PRACTICE_ITEMS,
      ...D8_PRACTICE_ITEMS,
      ...INTERACTIVE_PRACTICE_ITEMS,
      ...PRODUCT_ITEM_PACK,
    ];
    const rosters = everyPool.filter(
      (item) => item.answer.answer_spec.answer_type === "solution_set",
    );
    const exact = rosters.filter(
      (item) => item.answer.answer_spec.representation === "exact",
    );
    // Every exact roster is EL.6's one shape, and no other shape is one.
    expect([...new Set(exact.map((item) => item.template_id))]).toEqual([
      "d8.el6.exp-quadratic.l3",
    ]);
    for (const item of exact) {
      expect(item.node_id, item.item_version_id).toBe("EL.6");
    }
    expect(exact.length, "the exact rosters are in the pool").toBeGreaterThanOrEqual(7);
    // And the population it is being distinguished from is not empty: there really are
    // plain rosters elsewhere in the bank, and all of them are still representation-free.
    const plain = rosters.filter(
      (item) => item.answer.answer_spec.representation !== "exact",
    );
    expect(plain.length, "plain rosters exist to be left alone").toBeGreaterThanOrEqual(7);
    for (const item of plain) {
      expect(item.answer.answer_spec.representation, item.item_version_id).toBe("any");
    }
  });
});

/**
 * The variety guard. Every D8 template declares a `varietyKey`, and both freezers honour it:
 * content-hash distinctness alone would let two instances that reduce to the same question
 * sit in one cell, which matters more here than in most domains because several shapes reach
 * the same small exponent by different routes.
 */
describe("D8 variety guard (a cell never holds two instances of the same question)", () => {
  const templateById = new Map(ALL_D8_TEMPLATES.map((t) => [t.template_id, t]));

  function varietyOf(item: FrozenItem): string | undefined {
    return templateById.get(item.template_id)?.varietyKey?.(item.template_params);
  }

  it("declares a varietyKey on every template", () => {
    for (const template of ALL_D8_TEMPLATES) {
      expect(typeof template.varietyKey, template.template_id).toBe("function");
    }
  });

  it("gives every item in a (node, difficulty) cell a distinct variety key", () => {
    const byCell = new Map<string, string[]>();
    for (const item of D8_PRACTICE_POOL) {
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
    for (const item of D8_PRACTICE_VARIANTS) {
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
    for (const template of ALL_D8_TEMPLATES) {
      const made = D8_PRACTICE_VARIANTS.filter(
        (item) => item.template_id === template.template_id,
      ).length;
      expect(made, template.template_id).toBe(D8_PRACTICE_RETRY_VARIANTS_PER_CELL);
    }
  });
});

describe("D8 practice set (reshuffle without repeating a shape)", () => {
  const seededRng = () => {
    let seed = 1;
    return () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };
  };

  it("draws a distinct five-slot set in the locked easy-to-hard mix, for every node", () => {
    const rng = seededRng();
    for (const node of D8_PRACTICE_NODES) {
      for (let run = 0; run < 8; run += 1) {
        const set = buildRandomizedD8PracticeSet(node, rng);
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
    for (const node of D8_PRACTICE_NODES) {
      for (let run = 0; run < 30; run += 1) {
        const set = buildRandomizedD8PracticeSet(node, rng);
        for (const { difficulty } of D8_PRACTICE_MIX) {
          const slots = set.filter((item) => item.difficulty === difficulty);
          const shapesAvailable = new Set(
            D8_PRACTICE_ITEMS.filter(
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
      for (const item of buildRandomizedD8PracticeSet("EL.1", rng)) {
        seen.add(item.item_version_id);
      }
    }
    expect(seen.size).toBeGreaterThan(5);
  });
});

describe("D8 pool isolation (never touches the frozen EL.1 assessment or any other pool)", () => {
  it("shares no id or content with any other authored pool", () => {
    const others = [
      ...D1_ITEM_PACK,
      ...D1_PRACTICE_ITEMS,
      ...D1_WALK_ITEM_PACK,
      ...D2_PRACTICE_ITEMS,
      ...D5_PRACTICE_ITEMS,
      ...D7_PRACTICE_ITEMS,
      ...PRODUCT_ITEM_PACK,
      ...INTERACTIVE_PRACTICE_ITEMS,
    ];
    const otherIds = new Set(others.map((item) => item.item_version_id));
    const otherHashes = new Set(others.map(hashItemDefinition));
    for (const item of D8_PRACTICE_ITEMS) {
      expect(otherIds.has(item.item_version_id), item.item_version_id).toBe(false);
      expect(otherHashes.has(hashItemDefinition(item)), item.item_version_id).toBe(false);
    }
  });

  it("shares no template id with the frozen EL.1 product assessment", () => {
    const productTemplateIds = new Set(PRODUCT_ITEM_PACK.map((item) => item.template_id));
    expect(productTemplateIds.has("prod.el-1.l2"), "the frozen EL.1 item is here").toBe(
      true,
    );
    for (const template of ALL_D8_TEMPLATES) {
      expect(productTemplateIds.has(template.template_id), template.template_id).toBe(
        false,
      );
    }
  });
});

describe("D8 pool content pin (a template edit that changes the pool must be explicit)", () => {
  it("pins the frozen D8 practice pool ids + content hashes", () => {
    const snapshot = D8_PRACTICE_POOL.map((item) => ({
      id: item.item_version_id,
      node: item.node_id,
      difficulty: item.difficulty,
      hash: hashItemDefinition(item),
    }));
    expect(snapshot).toMatchSnapshot();
  });
});
