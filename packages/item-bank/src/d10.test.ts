import { describe, expect, it } from "vitest";

import { D1_ITEM_PACK, D1_PRACTICE_ITEMS, D1_WALK_ITEM_PACK } from "./d1";
import { D2_PRACTICE_ITEMS } from "./d2";
import { D5_PRACTICE_ITEMS } from "./d5";
import { D7_PRACTICE_ITEMS } from "./d7";
import { D8_PRACTICE_ITEMS } from "./d8";
import {
  buildRandomizedD10PracticeSet,
  D10_PRACTICE_ITEMS,
  D10_PRACTICE_MIX,
  D10_PRACTICE_NODES,
  D10_PRACTICE_POOL,
  D10_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D10_PRACTICE_TEMPLATES,
  D10_PRACTICE_VARIANTS,
  GEO1_TEMPLATES,
  GEO2_TEMPLATES,
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
 * The D10 (Geometry) practice pool. It pins the five-slot pool per node and proves the pool
 * self-validates through the v2 PRODUCT checker, composes the locked five-slot mix,
 * reshuffles without repeating a problem SHAPE, and is isolated from every other pool.
 *
 * `validate.test.ts` sweeps D1's templates and nothing else, so none of the invariants below
 * are covered by it: this file is where a D10 template that stops grading gets caught.
 *
 * Three D10-specific invariants are asserted here rather than left to a reader's care, each
 * of them a checker behaviour measured before authoring (`docs/D10_Domain_Plan.md`):
 *
 *  - **The exact-diagonal shape must keep its `simplified_radical` simplification.** That
 *    setting is the only reason `sqrt(50)` is rejected where `5*sqrt(2)` is accepted, and the
 *    simplification is exactly what the node teaches. A shape that lost it would still grade
 *    the right value while silently dropping the requirement it exists to test.
 *  - **The exact-pi shape must keep `pi` in `allowed_symbols`.** Nothing binds the symbol
 *    ambiently: without the declaration the ANSWER KEY itself fails with
 *    `scoring_error/invalid_answer_key`, so the item breaks for every learner at once.
 *  - **No answer anywhere in D10 carries a unit policy.** A unit in a typed answer grades
 *    `invalid_input/unknown_symbol`, so every prompt states its unit and asks for a plain
 *    number, and an item that started requiring one would fail learners who answered it as
 *    written.
 */

/** The answer types each node is allowed to serve. */
const NODE_ANSWER_TYPES: Readonly<Record<string, readonly string[]>> = {
  "GEO.1": ["numeric"],
  "GEO.2": ["numeric", "expression"],
};

/** Every D10 template, so a sweep cannot silently skip a node. */
const ALL_D10_TEMPLATES: readonly ItemTemplate[] = D10_PRACTICE_TEMPLATES;

describe("D10 practice templates (Geometry)", () => {
  it("authors every node's templates under its real node id with d10 ids", () => {
    const byNode: readonly (readonly [string, readonly ItemTemplate[], string])[] = [
      ["GEO.1", GEO1_TEMPLATES, "d10.geo1."],
      ["GEO.2", GEO2_TEMPLATES, "d10.geo2."],
    ];
    for (const [nodeId, templates, prefix] of byNode) {
      expect(templates.length, nodeId).toBeGreaterThanOrEqual(5);
      for (const template of templates) {
        expect(template.node_id, template.template_id).toBe(nodeId);
        expect(template.template_id.startsWith(prefix), template.template_id).toBe(true);
      }
    }
    expect(ALL_D10_TEMPLATES).toHaveLength(GEO1_TEMPLATES.length + GEO2_TEMPLATES.length);
  });

  it("registers exactly the nodes it has templates for", () => {
    expect([...D10_PRACTICE_NODES].sort()).toEqual(
      [...new Set(ALL_D10_TEMPLATES.map((t) => t.node_id))].sort(),
    );
  });

  it("composes the locked 1xL1 / 2xL2 / 2xL3 mix from distinct shapes at each level", () => {
    for (const [nodeId, templates] of [
      ["GEO.1", GEO1_TEMPLATES],
      ["GEO.2", GEO2_TEMPLATES],
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

  // Symbolic compares run through mathjs and cost far more per item than a plain numeric
  // compare, so these sweeps need more than vitest's 5s default, as every other domain's
  // pool test budgets the same way.
  it("every sampled instance of EVERY template self-validates through the v2 product checker", () => {
    expect(validateTemplates(ALL_D10_TEMPLATES, 40, PRODUCT_CHECKER_CONFIG)).toEqual([]);
  }, 60_000);

  it("the frozen practice pool composes the five-slot mix and self-validates", () => {
    expect(
      validatePracticePool(
        D10_PRACTICE_POOL,
        { nodes: D10_PRACTICE_NODES, mix: D10_PRACTICE_MIX },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  }, 60_000);

  /**
   * The reveal-to-retry variants are the instances a learner reaches by revealing a slot.
   * Composition is skipped (variants are not a five-slot mix); every other invariant applies.
   */
  it("every retry variant is a distinct, gradable practice item too", () => {
    expect(D10_PRACTICE_VARIANTS.length).toBeGreaterThan(D10_PRACTICE_POOL.length);
    expect(
      validatePracticePool(
        D10_PRACTICE_VARIANTS,
        { nodes: [], mix: [] },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  }, 60_000);
});

describe("D10 answers stay in the types and forms their questions call for", () => {
  it("serves each node only its allowed answer types", () => {
    for (const [nodeId, allowed] of Object.entries(NODE_ANSWER_TYPES)) {
      const items = D10_PRACTICE_ITEMS.filter((item) => item.node_id === nodeId);
      expect(items.length, nodeId).toBeGreaterThan(0);
      for (const item of items) {
        expect(allowed, item.item_version_id).toContain(
          item.answer.answer_spec.answer_type,
        );
      }
    }
  });

  /**
   * The exact-diagonal shape asks for a FORM, not just a value, and `simplified_radical` is
   * what makes the checker enforce it: measured, `sqrt(50)` against key `5*sqrt(2)` is
   * rejected `not_simplified` and the decimal `7.07` is `wrong_representation`. A shape that
   * lost this spec would keep grading the value while dropping the simplification the node
   * exists to teach, which is a silent loss rather than a loud one.
   */
  it("keeps the exact-diagonal shape on a simplified-radical spec", () => {
    const items = D10_PRACTICE_ITEMS.filter(
      (item) => item.template_id === "d10.geo1.exact-diagonal.l3",
    );
    expect(items.length, "the exact-diagonal shape is in the pool").toBeGreaterThan(0);
    for (const item of items) {
      const spec = item.answer.answer_spec;
      expect(spec.simplification, item.item_version_id).toBe("simplified_radical");
      expect(spec.representation, item.item_version_id).toBe("exact");
      // The key is what a learner types, and the glyph form is a parse error, so the key
      // itself has to be spelled the way the prompt tells them to spell it.
      expect(item.answer.answer_key, item.item_version_id).toMatch(/^\d+\*sqrt\(\d+\)$/);
    }
  });

  /**
   * The exact-pi shape is gradable ONLY because it declares the symbol. Without the
   * declaration the failure is not a rejected learner answer but a broken answer key
   * (`scoring_error/invalid_answer_key`), so this assertion guards the item's existence
   * rather than its strictness.
   */
  it("declares pi on the exact-pi shape, which is what binds the symbol", () => {
    const items = D10_PRACTICE_ITEMS.filter(
      (item) => item.template_id === "d10.geo2.cylinder-volume-exact.l3",
    );
    expect(items.length, "the exact-pi shape is in the pool").toBeGreaterThan(0);
    for (const item of items) {
      expect(item.answer.answer_spec.answer_type, item.item_version_id).toBe("expression");
      expect(item.answer.allowed_symbols ?? [], item.item_version_id).toContain("pi");
      expect(item.answer.answer_key, item.item_version_id).toMatch(/^\d+\*pi$/);
    }
  });

  /**
   * A unit in a typed answer grades `invalid_input/unknown_symbol`, and a degree sign is a
   * parse error, so D10 states every unit in the PROMPT. An item that acquired a unit policy
   * would start demanding something no prompt in the domain asks for.
   */
  it("asks for no unit anywhere, in any answer", () => {
    expect(D10_PRACTICE_ITEMS.length).toBeGreaterThan(0);
    for (const item of D10_PRACTICE_ITEMS) {
      expect(item.answer.answer_spec.unit_policy, item.item_version_id).toBe("none");
    }
  });

  /**
   * Every whole-number length and angle is a value rather than a form. A representation or a
   * precision appearing on one would be asking for a FORM without a prompt that says so, and
   * these prompts say only "Enter one number".
   */
  it("leaves every plain-value shape representation-free", () => {
    const formFree = D10_PRACTICE_ITEMS.filter(
      (item) =>
        item.template_id !== "d10.geo1.exact-diagonal.l3" &&
        item.template_id !== "d10.geo2.cylinder-volume-exact.l3",
    );
    expect(formFree.length).toBeGreaterThan(0);
    for (const item of formFree) {
      expect(item.answer.answer_spec.representation, item.item_version_id).toBe("any");
      expect(item.answer.answer_spec.precision, item.item_version_id).toBeNull();
    }
  });
});

/**
 * The variety guard. Every D10 template declares a `varietyKey`, and both freezers honour it:
 * content-hash distinctness alone would let two instances that reduce to the same question
 * sit in one cell. That matters here because a handful of Pythagorean triples carry several
 * shapes, and two cells drawing the 3-4-5 in different clothes would ask one question twice.
 */
describe("D10 variety guard (a cell never holds two instances of the same question)", () => {
  const templateById = new Map(ALL_D10_TEMPLATES.map((t) => [t.template_id, t]));

  function varietyOf(item: FrozenItem): string | undefined {
    return templateById.get(item.template_id)?.varietyKey?.(item.template_params);
  }

  it("declares a varietyKey on every template", () => {
    for (const template of ALL_D10_TEMPLATES) {
      expect(typeof template.varietyKey, template.template_id).toBe("function");
    }
  });

  it("gives every item in a (node, difficulty) cell a distinct variety key", () => {
    const byCell = new Map<string, string[]>();
    for (const item of D10_PRACTICE_POOL) {
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
    for (const item of D10_PRACTICE_VARIANTS) {
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
    for (const template of ALL_D10_TEMPLATES) {
      const made = D10_PRACTICE_VARIANTS.filter(
        (item) => item.template_id === template.template_id,
      ).length;
      expect(made, template.template_id).toBe(D10_PRACTICE_RETRY_VARIANTS_PER_CELL);
    }
  });
});

describe("D10 practice set (reshuffle without repeating a shape)", () => {
  const seededRng = () => {
    let seed = 1;
    return () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };
  };

  it("draws a distinct five-slot set in the locked easy-to-hard mix, for every node", () => {
    const rng = seededRng();
    for (const node of D10_PRACTICE_NODES) {
      for (let run = 0; run < 8; run += 1) {
        const set = buildRandomizedD10PracticeSet(node, rng);
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
    for (const node of D10_PRACTICE_NODES) {
      for (let run = 0; run < 30; run += 1) {
        const set = buildRandomizedD10PracticeSet(node, rng);
        for (const { difficulty } of D10_PRACTICE_MIX) {
          const slots = set.filter((item) => item.difficulty === difficulty);
          const shapesAvailable = new Set(
            D10_PRACTICE_ITEMS.filter(
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
      for (const item of buildRandomizedD10PracticeSet("GEO.1", rng)) {
        seen.add(item.item_version_id);
      }
    }
    expect(seen.size).toBeGreaterThan(5);
  });
});

describe("D10 pool isolation (shares nothing with any other pool)", () => {
  it("shares no id or content with any other authored pool", () => {
    const others = [
      ...D1_ITEM_PACK,
      ...D1_PRACTICE_ITEMS,
      ...D1_WALK_ITEM_PACK,
      ...D2_PRACTICE_ITEMS,
      ...D5_PRACTICE_ITEMS,
      ...D7_PRACTICE_ITEMS,
      ...D8_PRACTICE_ITEMS,
      ...PRODUCT_ITEM_PACK,
      ...INTERACTIVE_PRACTICE_ITEMS,
    ];
    const otherIds = new Set(others.map((item) => item.item_version_id));
    const otherHashes = new Set(others.map(hashItemDefinition));
    // The floor: an empty comparison set would let every assertion below pass vacuously.
    expect(otherIds.size, "the other pools loaded").toBeGreaterThan(100);
    for (const item of D10_PRACTICE_ITEMS) {
      expect(otherIds.has(item.item_version_id), item.item_version_id).toBe(false);
      expect(otherHashes.has(hashItemDefinition(item)), item.item_version_id).toBe(false);
    }
  });
});

describe("D10 pool content pin (a template edit that changes the pool must be explicit)", () => {
  it("pins the frozen D10 practice pool ids + content hashes", () => {
    const snapshot = D10_PRACTICE_POOL.map((item) => ({
      id: item.item_version_id,
      node: item.node_id,
      difficulty: item.difficulty,
      hash: hashItemDefinition(item),
    }));
    expect(snapshot).toMatchSnapshot();
  });
});
