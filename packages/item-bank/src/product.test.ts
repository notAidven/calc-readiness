import { createProductAnswerChecker, PRODUCT_CHECKER_VERSION } from "@cr/components";
import { describe, expect, it } from "vitest";

import { createItemPackWalkSource, toProductItemVersions } from "./bank";
import { D1_ITEM_PACK, D1_PRACTICE_ITEMS, D1_WALK_ITEM_PACK } from "./d1";
import {
  PRODUCT_FORM_A,
  PRODUCT_FORM_B,
  PRODUCT_GOLDEN_FIXTURES,
  PRODUCT_ITEM_PACK,
  PRODUCT_NODES,
  PRODUCT_TEMPLATES,
  PRODUCT_WALK_ITEMS_PER_CELL,
} from "./product";
import { hashItemDefinition, type ItemPackEntry } from "./schema";
import { PRODUCT_CHECKER_CONFIG, validateTemplates, validateWalkPool } from "./validate";

/** Every authored answer definition (frozen pool + golden anchors). */
const AUTHORED_SPECS = [
  ...PRODUCT_ITEM_PACK.map((item) => item.answer.answer_spec),
  ...PRODUCT_GOLDEN_FIXTURES.map((fixture) => fixture.answer.answer_spec),
];

describe("product templates (v2 checker net)", () => {
  it("author one L2 template per spine node, all difficulty 2", () => {
    expect(PRODUCT_TEMPLATES).toHaveLength(PRODUCT_NODES.length);
    expect(new Set(PRODUCT_TEMPLATES.map((t) => t.node_id))).toEqual(
      new Set(PRODUCT_NODES),
    );
    for (const template of PRODUCT_TEMPLATES) {
      expect(template.difficulty, template.template_id).toBe(2);
      expect(template.template_id.startsWith("prod."), template.template_id).toBe(true);
      // A structural varietyKey is required so a cell never freezes near-twins.
      expect(typeof template.varietyKey, template.template_id).toBe("function");
    }
  });

  it("authors the foundational spine + D2 radical nodes (EXP.1/TRG.1/TRG.2/RAD.2/RAD.3/RAD.4)", () => {
    const nodes = new Set(PRODUCT_TEMPLATES.map((t) => t.node_id));
    for (const node of ["EXP.1", "TRG.1", "TRG.2", "RAD.2", "RAD.3", "RAD.4"]) {
      expect(nodes.has(node), node).toBe(true);
    }
    expect(PRODUCT_TEMPLATES).toHaveLength(15);
  });

  it("every sampled instance grades correct through the REAL v2 checker (>=1000 samples)", () => {
    expect(validateTemplates(PRODUCT_TEMPLATES, 1000, PRODUCT_CHECKER_CONFIG)).toEqual([]);
  }, 60_000);
});

describe("product walk assessment pool (2-of-3 depth, isolation)", () => {
  it("freezes PRODUCT_WALK_ITEMS_PER_CELL L2 items per node per form", () => {
    const perForm = PRODUCT_TEMPLATES.length * PRODUCT_WALK_ITEMS_PER_CELL;
    expect(PRODUCT_FORM_A).toHaveLength(perForm);
    expect(PRODUCT_FORM_B).toHaveLength(perForm);
    for (const item of PRODUCT_ITEM_PACK) {
      expect(item.difficulty).toBe(2);
    }
  });

  it("has >=3 distinct items per served (form, node) — enough for the 2-of-3 rule", () => {
    for (const form of ["A", "B"] as const) {
      for (const node of PRODUCT_NODES) {
        const hashes = new Set(
          PRODUCT_ITEM_PACK.filter(
            (item) => item.form === form && item.node_id === node,
          ).map(hashItemDefinition),
        );
        expect(hashes.size, `${form}:${node}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("validateWalkPool reports no issues under the v2 checker config", () => {
    expect(
      validateWalkPool(
        PRODUCT_ITEM_PACK,
        { nodes: PRODUCT_NODES, minItemsPerCell: PRODUCT_WALK_ITEMS_PER_CELL },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  });

  it("A and B never share an id or content (no pre item reused at post)", () => {
    const idsA = new Set(PRODUCT_FORM_A.map((item) => item.item_version_id));
    const hashesA = new Set(PRODUCT_FORM_A.map(hashItemDefinition));
    for (const item of PRODUCT_FORM_B) {
      expect(idsA.has(item.item_version_id)).toBe(false);
      expect(hashesA.has(hashItemDefinition(item))).toBe(false);
    }
  });

  it("shares no id or content with any D1 pool (pool isolation)", () => {
    const others = [...D1_ITEM_PACK, ...D1_PRACTICE_ITEMS, ...D1_WALK_ITEM_PACK];
    const otherIds = new Set(others.map((item) => item.item_version_id));
    const otherHashes = new Set(others.map(hashItemDefinition));
    for (const item of PRODUCT_ITEM_PACK) {
      expect(otherIds.has(item.item_version_id), item.item_version_id).toBe(false);
      expect(otherHashes.has(hashItemDefinition(item)), item.item_version_id).toBe(false);
    }
  });

  it("serves 3 distinct, node-matched items per (form, node) via the walk source", () => {
    const source = createItemPackWalkSource(PRODUCT_ITEM_PACK);
    const byId = new Map(PRODUCT_ITEM_PACK.map((item) => [item.item_version_id, item]));
    for (const form of ["A", "B"]) {
      for (const node of PRODUCT_NODES) {
        const served = [0, 1, 2].map((attempt) =>
          source.selectProbeItem({ node_id: node, attempt, form_id: form }),
        );
        expect(
          new Set(served.map((item) => item.item_version_id)).size,
          `${form}:${node}`,
        ).toBe(3);
        for (const item of served) {
          expect(item.node_id).toBe(node);
          expect(byId.get(item.item_version_id), item.item_version_id).toBeDefined();
        }
      }
    }
  });

  it("pins the frozen product content hashes (a template edit that changes the pool must be explicit)", () => {
    const snapshot = PRODUCT_ITEM_PACK.map((item) => ({
      id: item.item_version_id,
      hash: hashItemDefinition(item),
    }));
    expect(snapshot).toMatchSnapshot();
  });
});

describe("product CI invariants (Answer_Equivalence_Spec §13)", () => {
  const checker = createProductAnswerChecker({
    itemVersions: toProductItemVersions(
      PRODUCT_GOLDEN_FIXTURES.map((fixture) => ({
        item_version_id: fixture.item_version_id,
        node_id: fixture.node_id,
        difficulty: 2 as const,
        form: "A" as const,
        prompt: fixture.prompt,
        answer: fixture.answer,
      })),
    ),
  });
  const grade = (id: string, raw: unknown) =>
    checker({
      raw_answer: raw,
      item_version_id: id,
      equivalence_checker_version: PRODUCT_CHECKER_VERSION,
    });

  it("§13.2 — every required_form key self-passes AND a malformed sibling fails", () => {
    const withForm = PRODUCT_GOLDEN_FIXTURES.filter(
      (fixture) => fixture.answer.answer_spec.required_form !== null,
    );
    // POL.1 (is_standard_polynomial) + POL.2 factor + POL.2 k-variant.
    expect(withForm.length).toBeGreaterThanOrEqual(3);
    for (const fixture of withForm) {
      expect(
        grade(fixture.item_version_id, fixture.valid).status,
        fixture.item_version_id,
      ).toBe("correct");
      const sibling = fixture.near_miss[0];
      expect(sibling, fixture.item_version_id).toBeDefined();
      if (sibling) {
        const graded = grade(fixture.item_version_id, sibling.answer);
        expect(graded.status, fixture.item_version_id).toBe("incorrect");
        expect(graded.reason_code, fixture.item_version_id).toBe(sibling.reason);
      }
    }
  });

  it("§13.4 — no authored item uses an undefined/blocked feature", () => {
    // positive_exponents + canonical_exact_trig_value are CLEARED (EXP.1/TRG.2), and
    // as of Answer_Equivalence_Spec.md v0.13 vertex form, set-builder notation, and
    // the graph geometric comparator (§8) are cleared too. The only still-uncleared
    // categories (spec §10) are general equation/inequality equivalence and general
    // trig/log identities beyond the EL.5 slice — general equivalence classes, not a
    // specific blockable simplification/form/notation enum — so no text-spec enum
    // stays blocked here. The `answer_type: "graph"` guard remains: a graph answer is
    // never a text AnswerSpec item (it's authored in the separate graph pack).
    // Sets kept (empty) so re-blocking a future form is a one-line change.
    // Include part specs so a multipart (TRG.2) is covered.
    const blockedSimplification = new Set<string>();
    const blockedRequiredForm = new Set<string>();
    const blockedNotation = new Set<string>();
    const specsWithParts = [
      ...AUTHORED_SPECS,
      ...PRODUCT_ITEM_PACK.flatMap((item) =>
        (item.answer.parts ?? []).map((part) => part.answer.answer_spec),
      ),
      ...PRODUCT_GOLDEN_FIXTURES.flatMap((fixture) =>
        (fixture.answer.parts ?? []).map((part) => part.answer.answer_spec),
      ),
    ];
    for (const spec of specsWithParts) {
      expect(blockedSimplification.has(spec.simplification)).toBe(false);
      expect(
        spec.required_form === null || !blockedRequiredForm.has(spec.required_form),
      ).toBe(true);
      expect(blockedNotation.has(spec.required_notation)).toBe(false);
      expect(spec.answer_type).not.toBe("graph");
    }
  });

  it("§13.8 — factoring is order-insensitive across every authored POL.2 item", () => {
    const pol2 = PRODUCT_ITEM_PACK.filter((item) => item.node_id === "POL.2");
    expect(pol2.length).toBeGreaterThan(0);
    const propChecker = createProductAnswerChecker({
      itemVersions: toProductItemVersions(pol2),
    });
    for (const item of pol2) {
      const key = String(item.answer.answer_key);
      // Swap the two binomial factors: (x + p)*(x + q) -> (x + q)*(x + p).
      const swapped = key.replace(/^\(([^)]*)\)\*\(([^)]*)\)$/, "($2)*($1)");
      for (const form of [key, swapped]) {
        expect(
          propChecker({
            raw_answer: form,
            item_version_id: item.item_version_id,
            equivalence_checker_version: PRODUCT_CHECKER_VERSION,
          }).status,
          form,
        ).toBe("correct");
      }
    }
  });

  it("§13.8 — solution_set is order-insensitive", () => {
    const twoRoot: ItemPackEntry = {
      item_version_id: "prop.lin-1.set",
      node_id: "LIN.1",
      difficulty: 2,
      form: "A",
      prompt: "Solve: x^2 = 4",
      answer: {
        answer_key: "{-2, 2}",
        answer_spec: {
          answer_type: "solution_set",
          equivalence: "structural",
          representation: "any",
          simplification: "none",
          required_form: null,
          required_notation: "none",
          precision: null,
          unit_policy: "none",
        },
      },
    };
    const setChecker = createProductAnswerChecker({
      itemVersions: toProductItemVersions([twoRoot]),
    });
    for (const raw of ["{-2, 2}", "{2, -2}", "2, -2"]) {
      expect(
        setChecker({
          raw_answer: raw,
          item_version_id: "prop.lin-1.set",
          equivalence_checker_version: PRODUCT_CHECKER_VERSION,
        }).status,
        raw,
      ).toBe("correct");
    }
  });
});
