import { createProductAnswerChecker, PRODUCT_CHECKER_VERSION } from "@cr/components";
import { describe, expect, it } from "vitest";

import { toProductItemVersions } from "./bank";
import {
  d8_el5_change_base_value_l3,
  d8_el5_condense_sum_l2,
  d8_el5_expand_power_l2,
  d8_el5_expand_product_l1,
  d8_el5_expand_quotient_l3,
  EL5_NODE,
  EL5_TEMPLATES,
  el5Symbol,
} from "./d8/nodes/EL.5";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "./template";
import { PRODUCT_CHECKER_CONFIG, validateTemplates } from "./validate";

/**
 * EL.5's own gate, kept beside the node rather than folded into `d8.test.ts`: EL.5 is the
 * only node in the repo whose answers are graded on FORM as well as on value, so the checks
 * that matter here have no counterpart anywhere else and would be dead weight in a
 * domain-wide sweep.
 *
 * What the form guard buys is asserted rather than assumed. `is_expanded_log` and
 * `is_condensed_log` are what stop a learner being credited for handing the prompt back
 * unchanged, and a template whose helper was swapped for a plain `expressionAnswer` would
 * still self-validate against its own key while quietly accepting the un-worked form. So
 * every algebraic shape here is graded twice through the REAL v2 checker: once on its key,
 * and once on the wrong-form answer its own prompt exists to rule out, with the reason code
 * pinned.
 */

/** One frozen instance of a template, from a fixed seed so a failure is reproducible. */
function instance(template: ItemTemplate, seed: number): FrozenItem {
  return generateFromTemplate(template, "practice", seed);
}

/** Grade `raw` against `item` through the real product checker. */
function grade(item: FrozenItem, raw: string) {
  const checker = createProductAnswerChecker({
    itemVersions: toProductItemVersions([item]),
  });
  return checker({
    raw_answer: raw,
    item_version_id: item.item_version_id,
    equivalence_checker_version: PRODUCT_CHECKER_VERSION,
  });
}

/** The two variables an instance drew, decoded from the indices it recorded. */
function variablesOf(item: FrozenItem): { s1: string; s2: string } {
  return {
    s1: el5Symbol(item.template_params.i ?? 0),
    s2: el5Symbol(item.template_params.j ?? 1),
  };
}

describe("EL.5 practice templates (logarithm properties)", () => {
  it("authors five shapes under the real node id with d8.el5 ids", () => {
    expect(EL5_TEMPLATES).toHaveLength(5);
    for (const template of EL5_TEMPLATES) {
      expect(template.node_id, template.template_id).toBe(EL5_NODE);
      expect(template.template_id.startsWith("d8.el5."), template.template_id).toBe(true);
    }
    expect(new Set(EL5_TEMPLATES.map((t) => t.template_id)).size).toBe(5);
  });

  it("composes the locked 1xL1 / 2xL2 / 2xL3 mix from distinct shapes at each level", () => {
    for (const [difficulty, expected] of [
      [1, 1],
      [2, 2],
      [3, 2],
    ] as const) {
      const atLevel = EL5_TEMPLATES.filter((t) => t.difficulty === difficulty);
      expect(atLevel.length, `L${difficulty}`).toBe(expected);
      expect(new Set(atLevel.map((t) => t.template_id)).size, `L${difficulty}`).toBe(
        expected,
      );
    }
  });

  /**
   * Every cell needs one pool item plus six distinct retry variants, and both freezers give
   * up after 200 misses rather than saying they under-delivered. A declared `varietyKey` is
   * what the freezers read; a parameter space too narrow to satisfy it is how a cell quietly
   * loses its depth, so the keys are also counted over a sweep of seeds.
   */
  it("declares a varietyKey on every template, over a wide enough parameter space", () => {
    for (const template of EL5_TEMPLATES) {
      expect(typeof template.varietyKey, template.template_id).toBe("function");
      const keys = new Set<string>();
      for (let seed = 0; seed < 120; seed += 1) {
        const item = instance(template, 500_000 + seed);
        keys.add(template.varietyKey?.(item.template_params) as string);
      }
      // Seven is the floor the freezers need; the real spaces are far wider than this.
      expect(keys.size, template.template_id).toBeGreaterThanOrEqual(7);
    }
  });

  // Symbolic compares run through mathjs and cost far more per item than a numeric one, so
  // this sweep needs more than vitest's 5s default (the same budget d8.test.ts uses).
  it("every sampled instance of every template self-validates through the v2 product checker", () => {
    expect(validateTemplates(EL5_TEMPLATES, 40, PRODUCT_CHECKER_CONFIG)).toEqual([]);
  }, 60_000);
});

describe("EL.5 form guards (the checker enforces the teaching, not just the value)", () => {
  it("rejects the condensed form of an expand-a-product item as not_expanded", () => {
    const item = instance(d8_el5_expand_product_l1, 611_001);
    const { s1, s2 } = variablesOf(item);

    expect(grade(item, `log(${s1}) + log(${s2})`).status).toBe("correct");
    // Order is not graded: the two logarithms are added, so either way round is the key.
    expect(grade(item, `log(${s2}) + log(${s1})`).status).toBe("correct");

    const condensed = grade(item, `log(${s1}*${s2})`);
    expect(condensed.status).toBe("incorrect");
    expect(condensed.reason_code).toBe("not_expanded");

    // Form and value are checked separately, and a wrong value says so in its own words.
    const wrongValue = grade(item, `log(${s1}) - log(${s2})`);
    expect(wrongValue.status).toBe("incorrect");
    expect(wrongValue.reason_code).toBe("value_mismatch");
  });

  it("rejects a PARTIAL expansion, so the power rule is genuinely graded", () => {
    const item = instance(d8_el5_expand_power_l2, 611_002);
    const { s1, s2 } = variablesOf(item);
    const n = item.template_params.n ?? 2;

    expect(grade(item, `${n} * log(${s1}) + log(${s2})`).status).toBe("correct");

    const partial = grade(item, `log(${s1}^${n}) + log(${s2})`);
    expect(partial.status).toBe("incorrect");
    expect(partial.reason_code).toBe("not_expanded");
  });

  it("rejects the expanded form of a condense item as not_condensed", () => {
    const item = instance(d8_el5_condense_sum_l2, 611_003);
    const { s1, s2 } = variablesOf(item);
    const kind = item.template_params.kind ?? 0;
    const s3 = el5Symbol(item.template_params.k ?? 0);
    const argument = kind === 1 ? `${s1}*${s2}*${s3}` : `${s1}*${s2}`;
    const expanded =
      kind === 1 ? `log(${s1}) + log(${s2}) + log(${s3})` : `log(${s1}) + log(${s2})`;

    expect(grade(item, `log(${argument})`).status).toBe("correct");

    const stillExpanded = grade(item, expanded);
    expect(stillExpanded.status).toBe("incorrect");
    expect(stillExpanded.reason_code).toBe("not_condensed");
  });

  it("rejects the un-expanded quotient, exponent and all", () => {
    const item = instance(d8_el5_expand_quotient_l3, 611_004);
    const { s1, s2 } = variablesOf(item);
    const kind = item.template_params.kind ?? 0;
    const n = item.template_params.n ?? 2;
    const key =
      kind === 1 ? `log(${s1}) - ${n} * log(${s2})` : `${n} * log(${s1}) - log(${s2})`;
    const condensed = kind === 1 ? `log(${s1}/(${s2}^${n}))` : `log((${s1}^${n})/${s2})`;

    expect(grade(item, key).status).toBe("correct");

    const notSplit = grade(item, condensed);
    expect(notSplit.status).toBe("incorrect");
    expect(notSplit.reason_code).toBe("not_expanded");
  });

  /**
   * The condense reveal must not end on a spelling the grader refuses.
   *
   * The typeset answer is the two symbols juxtaposed, $\log(xq)$, which is conventionally
   * correct and is what the figure and the last step both showed. The KEY is `log(x*q)`, and
   * two adjacent letters read as ONE symbol to the checker, so `log(xq)` grades
   * `invalid_input / unknown_symbol` — scored UNANSWERED under Answer_Equivalence_Spec §12.
   * A learner who typed back exactly what the reveal had just shown them therefore lost the
   * attempt and was told only that the format could not be read.
   *
   * Both halves are pinned. The first is the collision itself, which stays true after the fix
   * because the fix does not weaken the grader. The second is the property the fix adds: the
   * reveal's last line has to carry the typeable spelling as well as the typeset one, on
   * every draw rather than on the one a reader happened to open. The FIGURE's caption is the
   * other surface that prints it, and `@cr/item-bank` exports no helper it could share, so
   * `apps/web/src/lessons/worked/d8EL5.test.tsx` holds the same property against the rendered
   * caption. Neither file covers the other's surface.
   */
  it("refuses the juxtaposed spelling, which is why the reveal has to show the typeable one", () => {
    const item = instance(d8_el5_condense_sum_l2, 611_003);
    const { s1, s2 } = variablesOf(item);
    const kind = item.template_params.kind ?? 0;
    const s3 = el5Symbol(item.template_params.k ?? 0);
    const symbols = kind === 1 ? [s1, s2, s3] : [s1, s2];

    expect(grade(item, `log(${symbols.join("*")})`).status).toBe("correct");

    const juxtaposed = grade(item, `log(${symbols.join("")})`);
    expect(juxtaposed.status).toBe("invalid_input");
    expect(juxtaposed.reason_code).toBe("unknown_symbol");
  });

  it("ends the condense reveal on the typeable spelling, on every draw", () => {
    const kinds = new Set<number>();
    const missing: string[] = [];
    let swept = 0;
    for (let seed = 0; seed < 120; seed += 1) {
      const item = instance(d8_el5_condense_sum_l2, 620_000 + seed);
      kinds.add(item.template_params.kind ?? 0);
      swept += 1;
      const steps = item.worked_solution;
      const last = steps[steps.length - 1] ?? "";
      // An absent key is reported rather than defaulted: `last.includes("")` is true of every
      // string, so a `?? ""` here would turn a keyless item into a silent pass.
      const key = item.answer.answer_key;
      if (key === undefined || key === "" || !last.includes(key)) {
        missing.push(
          `${item.item_version_id}: last step "${last}" never shows "${key ?? "(no answer key)"}"`,
        );
      }
    }
    // A containment claim needs a count under it, and this one needs a SHAPE under it too:
    // the two-term and three-term draws build their argument by different branches.
    expect(swept).toBe(120);
    expect(
      [...kinds].sort(),
      "both the two-term and the three-term draw are covered",
    ).toEqual([0, 1]);
    expect(missing).toEqual([]);
  });

  /**
   * The measured behaviour of `precisionAnswer`: the declared precision is a FLOOR, so a
   * learner who carries extra digits is right and one who rounds early is not. Both halves
   * are pinned, because a shape that lost its precision spec would still accept the key.
   */
  it("treats the change-of-base precision as a floor rather than a format", () => {
    const item = instance(d8_el5_change_base_value_l3, 611_005);
    const b = item.template_params.b ?? 5;
    const n = item.template_params.n ?? 20;
    const exact = Math.log(n) / Math.log(b);

    expect(grade(item, exact.toFixed(3)).status).toBe("correct");
    expect(grade(item, exact.toFixed(5)).status).toBe("correct");

    const underRounded = grade(item, exact.toFixed(2));
    expect(underRounded.status).toBe("incorrect");
    expect(underRounded.reason_code).toBe("value_mismatch");
  });
});
