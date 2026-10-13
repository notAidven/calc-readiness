import { createD1MultistageSpec } from "@cr/diagnostic";
import { describe, expect, it } from "vitest";

import { D1_FORM_A, D1_FORM_B, D1_TEMPLATES } from "./d1";
import { hashItemDefinition } from "./schema";
import { freezeForm, generateFromTemplate, type ItemTemplate } from "./template";
import { validateTemplates } from "./validate";

describe("template generation", () => {
  const template = D1_TEMPLATES[0];
  if (!template) {
    throw new Error("no templates");
  }

  it("is deterministic for a given (template, form, seed)", () => {
    const a = generateFromTemplate(template, "A", 42);
    const b = generateFromTemplate(template, "A", 42);
    expect(a).toEqual(b);
  });

  it("varies with the seed and records provenance", () => {
    const a = generateFromTemplate(template, "A", 1);
    const b = generateFromTemplate(template, "A", 2);
    expect(a.item_version_id).not.toBe(b.item_version_id);
    expect(a.template_id).toBe(template.template_id);
    expect(typeof a.template_params).toBe("object");
  });
});

describe("D1 templates", () => {
  it("cover exactly the cells the multistage spec serves", () => {
    const specCells = new Set<string>();
    for (const stage of Object.values(createD1MultistageSpec().stages)) {
      for (const slot of stage.slots) {
        specCells.add(`${slot.node_id}:L${slot.difficulty}`);
      }
    }
    const templateCells = new Set(
      D1_TEMPLATES.map((template) => `${template.node_id}:L${template.difficulty}`),
    );
    expect(templateCells).toEqual(specCells);
  });

  it("pass template validation (every sampled instance grades correct)", () => {
    expect(validateTemplates(D1_TEMPLATES)).toEqual([]);
  });

  it("catches a template whose key contradicts its spec", () => {
    const broken: ItemTemplate = {
      template_id: "broken.fraction",
      node_id: "NUM.F",
      difficulty: 1,
      generate() {
        return {
          prompt: "broken",
          // representation says fraction, key is a decimal -> checker rejects
          answer: {
            answer_key: "0.5",
            answer_spec: {
              answer_type: "numeric",
              equivalence: "exact_value",
              representation: "fraction",
              simplification: "none",
              required_form: null,
              required_notation: "none",
              precision: null,
              unit_policy: "none",
            },
          },
          params: {},
          hints: ["Convert to a fraction in lowest terms."],
          worked_solution: ["This template is intentionally broken for the test."],
        };
      },
    };
    expect(
      validateTemplates([broken]).some(
        (issue) => issue.code === "template_instance_not_correct",
      ),
    ).toBe(true);
  });
});

describe("frozen forms (immutability guard)", () => {
  it("freeze one item per template into each form", () => {
    expect(D1_FORM_A).toHaveLength(D1_TEMPLATES.length);
    expect(D1_FORM_B).toHaveLength(D1_TEMPLATES.length);
  });

  it("A and B are structurally matched but never share an item", () => {
    const idsA = new Set(D1_FORM_A.map((item) => item.item_version_id));
    for (const item of D1_FORM_B) {
      expect(idsA.has(item.item_version_id)).toBe(false);
    }
  });

  it("re-freezing with the same seeds reproduces identical content (stable versions)", () => {
    const refrozen = freezeForm(D1_TEMPLATES, "A", 1000);
    expect(refrozen.map((item) => item.item_version_id)).toEqual(
      D1_FORM_A.map((item) => item.item_version_id),
    );
    expect(refrozen.map((item) => hashItemDefinition(item))).toEqual(
      D1_FORM_A.map((item) => hashItemDefinition(item)),
    );
  });

  it("pins the frozen content hashes (a template edit that changes a form must be explicit)", () => {
    const snapshot = [...D1_FORM_A, ...D1_FORM_B].map((item) => ({
      id: item.item_version_id,
      hash: hashItemDefinition(item),
    }));
    expect(snapshot).toMatchSnapshot();
  });
});
