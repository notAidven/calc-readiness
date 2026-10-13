import { createD1AnswerChecker, D1_CHECKER_VERSION } from "@cr/components";
import { describe, expect, it } from "vitest";

import { createItemPackWalkSource, toD1ItemVersions } from "./bank";
import {
  D1_ITEM_PACK,
  D1_PRACTICE_ITEMS,
  D1_PRACTICE_NODES,
  D1_WALK_FORM_A,
  D1_WALK_FORM_B,
  D1_WALK_ITEM_PACK,
  D1_WALK_ITEMS_PER_CELL,
  D1_WALK_TEMPLATES,
} from "./d1";
import { hashItemDefinition } from "./schema";
import { validateTemplates, validateWalkPool } from "./validate";

describe("D1 walk assessment pool (Amendment v2 §8 — 2-of-3 depth)", () => {
  it("freezes D1_WALK_ITEMS_PER_CELL L2 items per node per form", () => {
    const perForm = D1_WALK_TEMPLATES.length * D1_WALK_ITEMS_PER_CELL;
    expect(D1_WALK_FORM_A).toHaveLength(perForm);
    expect(D1_WALK_FORM_B).toHaveLength(perForm);
    // Every walk item is at the routing difficulty L2 (the level every node authors).
    for (const item of D1_WALK_ITEM_PACK) {
      expect(item.difficulty).toBe(2);
    }
    // Exactly D1_WALK_ITEMS_PER_CELL per (form, node).
    for (const form of [D1_WALK_FORM_A, D1_WALK_FORM_B]) {
      for (const node of D1_PRACTICE_NODES) {
        const count = form.filter((item) => item.node_id === node).length;
        expect(count, node).toBe(D1_WALK_ITEMS_PER_CELL);
      }
    }
  });

  it("has ≥3 distinct items per served node — enough for a confirmed fail / non-robust pass", () => {
    // The whole point of §8: three DISTINCT items can be served for one node.
    for (const form of ["A", "B"] as const) {
      for (const node of D1_PRACTICE_NODES) {
        const hashes = new Set(
          D1_WALK_ITEM_PACK.filter(
            (item) => item.form === form && item.node_id === node,
          ).map(hashItemDefinition),
        );
        expect(hashes.size, `${form}:${node}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("A and B never share an id or content (no pre item reused at post)", () => {
    const idsA = new Set(D1_WALK_FORM_A.map((item) => item.item_version_id));
    const hashesA = new Set(D1_WALK_FORM_A.map(hashItemDefinition));
    for (const item of D1_WALK_FORM_B) {
      expect(idsA.has(item.item_version_id)).toBe(false);
      expect(hashesA.has(hashItemDefinition(item))).toBe(false);
    }
  });

  it("shares no id or content with the v1 MST pack or the practice pool (pool isolation)", () => {
    const otherIds = new Set(
      [...D1_ITEM_PACK, ...D1_PRACTICE_ITEMS].map((item) => item.item_version_id),
    );
    const otherHashes = new Set(
      [...D1_ITEM_PACK, ...D1_PRACTICE_ITEMS].map(hashItemDefinition),
    );
    for (const item of D1_WALK_ITEM_PACK) {
      expect(otherIds.has(item.item_version_id), item.item_version_id).toBe(false);
      expect(otherHashes.has(hashItemDefinition(item)), item.item_version_id).toBe(false);
    }
  });

  it("serves structurally-varied instances per cell (no near-twins)", () => {
    // Each cell's parallel instances must differ in their leading structure, not
    // just full content — so a student never sees `5(3x+4)` and `5(3x+5)` together,
    // nor three `20%` items in one node.
    const lead: Record<string, (p: Record<string, number>) => string> = {
      "NUM.S": (p) => `${p.a}:${p.b}`,
      "NUM.2": (p) => `${p.a}:${p.b}`,
      "NUM.3": (p) => `${p.a}:${p.b}`,
      "NUM.4": (p) => `${p.p}:${p.q}`,
      "NUM.F": (p) => `${p.d1}:${p.d2}`,
      "NUM.5": (p) => `${p.p}:${p.reverse}`,
    };
    for (const form of ["A", "B"] as const) {
      for (const [node, key] of Object.entries(lead)) {
        const keys = D1_WALK_ITEM_PACK.filter(
          (item) => item.form === form && item.node_id === node,
        ).map((item) => key(item.template_params));
        expect(new Set(keys).size, `${form}:${node}`).toBe(keys.length);
      }
    }
  });

  it("has one L2 generator per served node — the dedicated (tightened) walk set", () => {
    expect(D1_WALK_TEMPLATES).toHaveLength(D1_PRACTICE_NODES.length);
    for (const template of D1_WALK_TEMPLATES) {
      expect(template.difficulty).toBe(2);
    }
    // The walk draws from its OWN generators, disjoint from the shared v1 set.
    for (const template of D1_WALK_TEMPLATES) {
      expect(template.template_id.startsWith("d1w.")).toBe(true);
    }
  });

  it("every walk template grades self-consistent across sampled instances", () => {
    // Stress the tightened generators (no-50% percents + reverse form, commutativity
    // guards) the same way the v1 set is stressed: 25 sampled instances per template,
    // each graded through the real authoritative checker.
    expect(validateTemplates(D1_WALK_TEMPLATES)).toEqual([]);
  });

  it("pins the frozen walk content hashes (a template edit that changes the pool must be explicit)", () => {
    const snapshot = D1_WALK_ITEM_PACK.map((item) => ({
      id: item.item_version_id,
      hash: hashItemDefinition(item),
    }));
    expect(snapshot).toMatchSnapshot();
  });
});

describe("validateWalkPool", () => {
  const expected = {
    nodes: D1_PRACTICE_NODES,
    minItemsPerCell: D1_WALK_ITEMS_PER_CELL,
  };

  it("reports no issues on the frozen walk pool", () => {
    expect(validateWalkPool(D1_WALK_ITEM_PACK, expected)).toEqual([]);
  });

  it("flags a node whose pool is too thin for the 2-of-3 rule", () => {
    // Drop two of NUM.2's Form-A items → only one left, below the ≥3 depth bar.
    let dropped = 0;
    const thin = D1_WALK_ITEM_PACK.filter((item) => {
      if (item.form === "A" && item.node_id === "NUM.2" && dropped < 2) {
        dropped += 1;
        return false;
      }
      return true;
    });
    const issues = validateWalkPool(thin, expected);
    expect(issues.some((issue) => issue.code === "insufficient_walk_depth")).toBe(true);
  });

  it("flags a practice item that leaked into the walk pool", () => {
    const leaked = D1_PRACTICE_ITEMS[0];
    if (!leaked) {
      throw new Error("practice pool is empty");
    }
    const issues = validateWalkPool([...D1_WALK_ITEM_PACK, leaked], expected);
    expect(issues.some((issue) => issue.code === "not_an_assessment_item")).toBe(true);
  });
});

describe("createItemPackWalkSource over the walk pool", () => {
  const checker = createD1AnswerChecker({
    itemVersions: toD1ItemVersions(D1_WALK_ITEM_PACK),
  });

  it("serves three distinct, gradable, node-matched items per (form, node)", () => {
    const source = createItemPackWalkSource(D1_WALK_ITEM_PACK);
    const byId = new Map(D1_WALK_ITEM_PACK.map((item) => [item.item_version_id, item]));

    for (const form of ["A", "B"]) {
      for (const node of D1_PRACTICE_NODES) {
        const served = [0, 1, 2].map((attempt) =>
          source.selectProbeItem({ node_id: node, attempt, form_id: form }),
        );
        // Distinct across the three attempts.
        expect(new Set(served.map((item) => item.item_version_id)).size).toBe(3);
        for (const item of served) {
          expect(item.node_id).toBe(node);
          const entry = byId.get(item.item_version_id);
          expect(entry, item.item_version_id).toBeDefined();
          if (entry) {
            expect(item.item_definition_hash).toBe(hashItemDefinition(entry));
            // The served key grades correct through the authoritative checker.
            const result = checker({
              raw_answer: entry.answer.answer_key,
              item_version_id: entry.item_version_id,
              equivalence_checker_version: D1_CHECKER_VERSION,
            });
            expect(result.status).toBe("correct");
          }
        }
      }
    }
  });

  it("is deterministic per (form, node, attempt) — a fault re-serves the same item", () => {
    const source = createItemPackWalkSource(D1_WALK_ITEM_PACK);
    const first = source.selectProbeItem({ node_id: "NUM.2", attempt: 0, form_id: "A" });
    const again = source.selectProbeItem({ node_id: "NUM.2", attempt: 0, form_id: "A" });
    expect(again.item_version_id).toBe(first.item_version_id);
  });

  it("serves different items for form A vs B (counterbalanced)", () => {
    const source = createItemPackWalkSource(D1_WALK_ITEM_PACK);
    const a = source.selectProbeItem({ node_id: "NUM.2", attempt: 0, form_id: "A" });
    const b = source.selectProbeItem({ node_id: "NUM.2", attempt: 0, form_id: "B" });
    expect(a.item_version_id).not.toBe(b.item_version_id);
  });

  it("throws when asked past the authored depth (surfaces a thin pool loudly)", () => {
    const source = createItemPackWalkSource(D1_WALK_ITEM_PACK);
    expect(() =>
      source.selectProbeItem({ node_id: "NUM.2", attempt: 3, form_id: "A" }),
    ).toThrow(/pool too thin/);
  });

  it("cannot yet serve a 3rd item from the v1 MST pack (why §8 was a blocker)", () => {
    // The v1 forms are 1 item/(node,difficulty) cell → 2 items/node. Attempt 2 (the
    // asymmetric-confirm third item) has nothing — exactly the gap the walk pool fills.
    const v1Source = createItemPackWalkSource(D1_ITEM_PACK);
    expect(() =>
      v1Source.selectProbeItem({ node_id: "NUM.2", attempt: 2, form_id: "A" }),
    ).toThrow(/pool too thin/);
  });
});
