import { describe, expect, it } from "vitest";

import { D1_ITEM_PACK, D1_PRACTICE_TEMPLATES } from "./d1";
import { hashItemDefinition, type ItemPackEntry } from "./schema";
import type { ItemTemplate, Rng } from "./template";
import { hasIdentityRestatement, validateItemBank, validateTemplates } from "./validate";

describe("validateItemBank on the seed D1 pack", () => {
  it("reports no issues (keys grade correct, full A/B coverage, unique ids)", () => {
    expect(validateItemBank(D1_ITEM_PACK)).toEqual([]);
  });

  it("assigns a stable, unique content hash to every distinct item", () => {
    const hashes = D1_ITEM_PACK.map((entry) => hashItemDefinition(entry));
    expect(new Set(hashes).size).toBe(D1_ITEM_PACK.length);
    // deterministic
    const first = D1_ITEM_PACK[0];
    if (first) {
      expect(hashItemDefinition(first)).toBe(hashItemDefinition(first));
    }
  });
});

describe("validateItemBank catches authoring errors", () => {
  const good = D1_ITEM_PACK[0];
  if (!good) {
    throw new Error("seed pack is empty");
  }

  it("flags a duplicate item_version_id", () => {
    const issues = validateItemBank([...D1_ITEM_PACK, { ...good }]);
    expect(issues.some((issue) => issue.code === "duplicate_item_version_id")).toBe(true);
  });

  it("flags an answer key that violates its own spec (self-consistency)", () => {
    // representation says fraction, but the key is a decimal -> checker rejects it
    const broken: ItemPackEntry = {
      ...good,
      item_version_id: "d1:NUM.F:A:L2:broken",
      answer: {
        answer_key: "0.75",
        answer_spec: { ...good.answer.answer_spec, representation: "fraction" },
      },
    };
    const issues = validateItemBank([...D1_ITEM_PACK, broken]);
    expect(issues.some((issue) => issue.code === "answer_key_not_correct")).toBe(true);
  });

  it("flags missing coverage when a form drops a cell", () => {
    const missingOneCell = D1_ITEM_PACK.filter(
      (entry) => entry.item_version_id !== good.item_version_id,
    );
    const issues = validateItemBank(missingOneCell);
    expect(issues.some((issue) => issue.code === "missing_coverage")).toBe(true);
  });

  it("flags an expression item with no allowed_symbols", () => {
    const badExpression: ItemPackEntry = {
      ...good,
      item_version_id: "d1:NUM.3:A:L2:expr",
      answer: {
        answer_key: "x + 1",
        answer_spec: {
          ...good.answer.answer_spec,
          answer_type: "expression",
          equivalence: "symbolic",
        },
      },
    };
    const issues = validateItemBank([...D1_ITEM_PACK, badExpression]);
    expect(issues.some((issue) => issue.code === "missing_allowed_symbols")).toBe(true);
  });
});

describe("validateTemplates enforces the hint/reveal invariants", () => {
  // Budget above the 5s default: the 34-template pool runs the symbolic checker for
  // every NUM.3/NUM.4 expression answer and sits near 4s. Throughput, not a hang.
  it("passes for the full practice template grid (hints scale to difficulty, no leaks)", () => {
    expect(validateTemplates(D1_PRACTICE_TEMPLATES)).toEqual([]);
  }, 60_000);

  it("flags a hint count outside the 1-to-3 range", () => {
    const tooMany: ItemTemplate = {
      template_id: "test.hint-count",
      node_id: "NUM.2",
      difficulty: 3,
      generate(rng: Rng) {
        const a = rng.int(1, 5);
        return {
          prompt: `Evaluate $${a} + 1$.`,
          answer: {
            answer_key: `${a + 1}`,
            answer_spec: {
              answer_type: "numeric",
              equivalence: "exact_value",
              representation: "any",
              simplification: "none",
              required_form: null,
              required_notation: "none",
              precision: null,
              unit_policy: "none",
            },
          },
          params: { a },
          hints: [
            "Start by lining up the two numbers.",
            "Adding one moves to the next whole number.",
            "Count up by one from the first number.",
            "One hint too many for the 1-to-3 rule.",
          ],
          worked_solution: ["Add 1."],
        };
      },
    };
    expect(
      validateTemplates([tooMany]).some((issue) => issue.code === "hint_count_mismatch"),
    ).toBe(true);
  });

  it("flags a hint that leaks the answer key", () => {
    const leaks: ItemTemplate = {
      template_id: "test.hint-leak",
      node_id: "NUM.2",
      difficulty: 1,
      generate() {
        return {
          prompt: "Evaluate $2 + 3$.",
          answer: {
            answer_key: "5",
            answer_spec: {
              answer_type: "numeric",
              equivalence: "exact_value",
              representation: "any",
              simplification: "none",
              required_form: null,
              required_notation: "none",
              precision: null,
              unit_policy: "none",
            },
          },
          params: {},
          hints: ["The answer is 5."],
          worked_solution: ["Add: 2 + 3 = 5."],
        };
      },
    };
    expect(
      validateTemplates([leaks]).some((issue) => issue.code === "hint_leaks_answer"),
    ).toBe(true);
  });

  it("flags a worked-solution step that restates itself across the equals sign", () => {
    const restates: ItemTemplate = {
      template_id: "test.identity-step",
      node_id: "NUM.F",
      difficulty: 1,
      generate() {
        return {
          prompt: "Evaluate $\\dfrac{2}{5} + \\dfrac{1}{5}$.",
          answer: {
            answer_key: "3/5",
            answer_spec: {
              answer_type: "numeric",
              equivalence: "exact_value",
              representation: "any",
              simplification: "none",
              required_form: null,
              required_notation: "none",
              precision: null,
              unit_policy: "none",
            },
          },
          params: {},
          hints: ["Keep the denominator and add the numerators."],
          // The shape this rule exists for: a reduce step on a value that was
          // already reduced, so both sides of the `=` print the same fraction.
          worked_solution: ["Reduce to lowest terms: $\\dfrac{3}{5} = \\tfrac{3}{5}$."],
        };
      },
    };
    expect(
      validateTemplates([restates]).some(
        (issue) => issue.code === "worked_solution_identity_step",
      ),
    ).toBe(true);
  });
});

describe("hasIdentityRestatement", () => {
  it("catches a repeated side, across display and inline fraction forms", () => {
    expect(hasIdentityRestatement("$\\dfrac{3}{5} = \\dfrac{3}{5}$")).toBe(true);
    // The reported caption verbatim: prose around the span must not hide the repeat.
    expect(
      hasIdentityRestatement(
        "Same denominator: add the numerators to get $\\tfrac{3}{5} = \\tfrac{3}{5}$.",
      ),
    ).toBe(true);
    expect(hasIdentityRestatement("$\\tfrac{3}{5} = \\dfrac{3}{5}$")).toBe(true);
    expect(hasIdentityRestatement("$\\dfrac{4}{6} = \\dfrac{4}{6} = \\dfrac{2}{3}$")).toBe(
      true,
    );
  });

  it("leaves real steps alone", () => {
    expect(hasIdentityRestatement("$\\dfrac{4}{6} = \\dfrac{2}{3}$")).toBe(false);
    expect(hasIdentityRestatement("$\\lvert 3 \\rvert = 3$")).toBe(false);
    expect(hasIdentityRestatement("$a + 0 = a$")).toBe(false);
    // A continuation row opening with `=` has nothing before it to repeat.
    expect(hasIdentityRestatement("= \\dfrac{3}{5}")).toBe(false);
  });
});
