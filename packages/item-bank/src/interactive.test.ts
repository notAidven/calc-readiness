import { describe, expect, it } from "vitest";

import { D1_ITEM_PACK, D1_PRACTICE_ITEMS, D1_WALK_ITEM_PACK } from "./d1";
import {
  buildRandomizedInteractivePracticeSet,
  INTERACTIVE_DEMO_NODE,
  INTERACTIVE_PRACTICE_ITEMS,
  INTERACTIVE_PRACTICE_MIX,
  INTERACTIVE_PRACTICE_POOL,
  INTERACTIVE_TEMPLATES,
} from "./index";
import { PRODUCT_ITEM_PACK } from "./product";
import { hashItemDefinition } from "./schema";
import {
  INTERACTIVE_CHECKER_CONFIG,
  validatePracticePool,
  validateTemplates,
} from "./validate";

/**
 * The interactive practice pool (Phase 4). It pins the number_line demo pool and
 * proves it self-validates through the INTERACTIVE checker (each item's canonical
 * widget payload grades correct), composes the locked five-slot mix, reshuffles
 * without repeating, and is fully isolated from every shipped D1 / product pool —
 * so this infrastructure proof never touches shipped content.
 */

describe("interactive practice templates (number_line demo pool)", () => {
  it("authors number_line templates under the synthetic demo node", () => {
    for (const template of INTERACTIVE_TEMPLATES) {
      expect(template.node_id, template.template_id).toBe(INTERACTIVE_DEMO_NODE);
      expect(template.template_id.startsWith("int.nl."), template.template_id).toBe(true);
    }
  });

  it("every sampled instance self-validates through the interactive checker", () => {
    expect(
      validateTemplates(INTERACTIVE_TEMPLATES, 50, INTERACTIVE_CHECKER_CONFIG),
    ).toEqual([]);
  });

  it("the frozen practice pool composes the five-slot mix and self-validates", () => {
    expect(
      validatePracticePool(
        INTERACTIVE_PRACTICE_POOL,
        { nodes: [INTERACTIVE_DEMO_NODE], mix: INTERACTIVE_PRACTICE_MIX },
        INTERACTIVE_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  });
});

describe("interactive practice set (reshuffle without repeat)", () => {
  it("draws a distinct five-slot set in the locked easy→hard mix", () => {
    let seed = 1;
    const rng = () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };
    for (let run = 0; run < 8; run += 1) {
      const set = buildRandomizedInteractivePracticeSet(rng);
      expect(set).toHaveLength(5);
      expect(new Set(set.map((item) => item.item_version_id)).size).toBe(5);
      expect(set.map((item) => item.difficulty)).toEqual([1, 2, 2, 3, 3]);
    }
  });
});

describe("interactive pool isolation (never touches shipped content)", () => {
  it("shares no id or content with any D1 or product pool", () => {
    const others = [
      ...D1_ITEM_PACK,
      ...D1_PRACTICE_ITEMS,
      ...D1_WALK_ITEM_PACK,
      ...PRODUCT_ITEM_PACK,
    ];
    const otherIds = new Set(others.map((item) => item.item_version_id));
    const otherHashes = new Set(others.map(hashItemDefinition));
    for (const item of INTERACTIVE_PRACTICE_ITEMS) {
      expect(otherIds.has(item.item_version_id), item.item_version_id).toBe(false);
      expect(otherHashes.has(hashItemDefinition(item)), item.item_version_id).toBe(false);
    }
  });
});

describe("interactive pool content pin (a template edit that changes the pool must be explicit)", () => {
  it("pins the frozen interactive pool ids + content hashes", () => {
    const snapshot = INTERACTIVE_PRACTICE_POOL.map((item) => ({
      id: item.item_version_id,
      node: item.node_id,
      difficulty: item.difficulty,
      hash: hashItemDefinition(item),
    }));
    expect(snapshot).toMatchSnapshot();
  });
});
