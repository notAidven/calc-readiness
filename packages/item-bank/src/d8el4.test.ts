import { describe, expect, it } from "vitest";

import { EL4_NODE, EL4_TEMPLATES } from "./d8/nodes/EL.4";
import { PRODUCT_CHECKER_CONFIG, validateTemplates } from "./validate";

/**
 * EL.4's five practice shapes, validated on their own so the node can be authored and checked
 * before the pool wiring lands. `d8.test.ts` is the shared sweep and belongs to whoever wires
 * the domain; this file asserts only what is true of these templates in isolation.
 *
 * Three claims, and the first is the load-bearing one:
 *
 *  1. every sampled instance grades CORRECT against its own key through the real v2 product
 *     checker, which is what proves the set-builder and point keys are gradable at all and that
 *     no numeric prompt is asking for something the numeric path rejects;
 *  2. the five compose the locked 1xL1 / 2xL2 / 2xL3 mix from five distinct template ids, so
 *     the node can fill a five-slot practice set;
 *  3. every template declares a `varietyKey`, which is what stops a cell freezing two instances
 *     that reduce to the same question.
 *
 * The sweep is budgeted at 60 seconds because a set-builder and a point compare both run
 * through mathjs, and 40 samples of five templates is well past vitest's 5s default.
 */

describe("EL.4 practice templates (graph logarithmic functions; state domain)", () => {
  it("authors five shapes, all on EL.4, all with d8.el4 ids", () => {
    expect(EL4_TEMPLATES).toHaveLength(5);
    for (const template of EL4_TEMPLATES) {
      expect(template.node_id, template.template_id).toBe(EL4_NODE);
      expect(template.template_id.startsWith("d8.el4."), template.template_id).toBe(true);
    }
    expect(new Set(EL4_TEMPLATES.map((t) => t.template_id)).size).toBe(5);
  });

  it("composes the locked 1xL1 / 2xL2 / 2xL3 mix from distinct shapes at each level", () => {
    for (const [difficulty, expected] of [
      [1, 1],
      [2, 2],
      [3, 2],
    ] as const) {
      const atLevel = EL4_TEMPLATES.filter((t) => t.difficulty === difficulty);
      expect(atLevel.length, `L${difficulty}`).toBe(expected);
      // Two slots at a level must be fillable by two genuinely different problem shapes.
      expect(new Set(atLevel.map((t) => t.template_id)).size, `L${difficulty}`).toBe(
        expected,
      );
    }
  });

  it("declares a varietyKey on every template", () => {
    for (const template of EL4_TEMPLATES) {
      expect(typeof template.varietyKey, template.template_id).toBe("function");
    }
  });

  it("every sampled instance self-validates through the v2 product checker", () => {
    expect(validateTemplates(EL4_TEMPLATES, 40, PRODUCT_CHECKER_CONFIG)).toEqual([]);
  }, 60_000);
});
