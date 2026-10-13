import { describe, expect, it } from "vitest";

import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "../template";
import {
  D9_EXTRA_PRACTICE_TEMPLATES,
  D9_PRACTICE_ITEMS,
  D9_PRACTICE_NODES,
  D9_PRACTICE_TEMPLATES,
} from "./index";

/**
 * D9's hardest tier is never answered by picking a word off a printed list.
 *
 * Two of this domain's L3 slots were choose-one items: `d9.trg4.identity-name.l3` printed
 * `pythagorean`, `quotient` and `reciprocal` and asked which family a line belonged to, and
 * `d9.trg9.formula-name.l3` printed `sum`, `difference` and `double-angle` and asked which
 * identity collapsed an expression. Both were argued into the tier on content — naming the
 * relation you have just used is a different thing from running it, and no other slot on
 * either node separated those two — and the argument is a good one. It is an argument about
 * what the item TESTS, and the tier is a claim about what the item COSTS. A learner who
 * cannot do either of them scores a third of the time by touching nothing, which is a floor
 * no other L3 in the domain has, and the hardest slot on a node is the one place that floor
 * cannot be afforded. Both are now L2, one L2 has retired from each node to keep the mix at
 * 1xL1 / 2xL2 / 2xL3, and two evaluation shapes that chain four identities each took the
 * vacated L3 slots (`docs/D9_Domain_Plan.md`, "The hardest tier is never a choice off a
 * printed list").
 *
 * ## The population, and why this is the right derivation
 *
 * The defect is "a learner meets a question at the node's hardest tier and answers it by
 * choosing one of a handful of options printed in the prompt". So the question the population
 * has to answer is not "which file holds a naming item" but "what would have to be true of a
 * template for that to be possible", and there are exactly two conditions: it is served at
 * the hardest tier, and the answer it grades is `multiple_choice`.
 *
 * Three narrower derivations were available and all three are the trap
 * `.cursor/rules/qa-verification.mdc` describes, where a filter is one clean pass over a real
 * source and still selects the wrong set:
 *
 *  - **By implementation.** Grepping the node sources for `multipleChoiceAnswer` scopes the
 *    sweep to the helper rather than to the behaviour. A template that hand-rolls the same
 *    `answer_spec`, or reaches choose-one through a future builder, exhibits the defect
 *    without importing a line of it. So the answer type is read off GENERATED instances
 *    instead — what the template serves, not what it calls.
 *  - **By naming convention.** `-name.l3` catches both of the two that shipped and nothing
 *    else ever again.
 *  - **By the frozen pool alone.** A template is authorable before it is frozen, and the
 *    retry variants reach a learner just as the pool does. Both layers are swept below.
 *
 * **"Difficulty 3" is itself a stand-in for "the hardest tier", so it is measured rather than
 * assumed.** The first assertion in this file establishes that every D9 node's shapes top out
 * at difficulty 3 and that two of them sit there, which is what makes the filter beneath it
 * mean what its name says. If a node ever gained an L4, that assertion fails and this file
 * gets rewritten rather than going on measuring the second-hardest tier.
 *
 * ## What stops it passing on nothing
 *
 * A sweep that finds no multiple-choice item at L3 is satisfied just as happily by a domain
 * that has no multiple-choice items at all, so the reverse direction is asserted beside it:
 * the answer type is genuinely in use at L1/L2, over templates and over served instances,
 * with floors under both. The L3 population carries its own floor at 18 (nine nodes, two
 * shapes each) so a filter that quietly selected nothing would fail rather than pass.
 */

/** Draws per template for the answer-type census: enough to catch a branched answer shape. */
const CENSUS_DRAWS = 24;

/** Draws per template for the two new L3 shapes, which are checked instance by instance. */
const L3_DRAWS = 200;

/** Seed block for this file alone, so no draw here collides with another suite's. */
const SEED_BASE = 786_000;

/** The locked-mix shapes: the nine nodes' own five, without the extra L2 shapes appended. */
const LOCKED_TEMPLATES: readonly ItemTemplate[] = D9_PRACTICE_TEMPLATES.filter(
  (template) => !D9_EXTRA_PRACTICE_TEMPLATES.includes(template),
);

const L3_TEMPLATES: readonly ItemTemplate[] = D9_PRACTICE_TEMPLATES.filter(
  (template) => template.difficulty === 3,
);

const BELOW_L3_TEMPLATES: readonly ItemTemplate[] = D9_PRACTICE_TEMPLATES.filter(
  (template) => template.difficulty < 3,
);

const L3_ITEMS: readonly FrozenItem[] = D9_PRACTICE_ITEMS.filter(
  (item) => item.difficulty === 3,
);

const BELOW_L3_ITEMS: readonly FrozenItem[] = D9_PRACTICE_ITEMS.filter(
  (item) => item.difficulty < 3,
);

/**
 * The two shapes authored into the vacated L3 slots.
 *
 * Held as ids rather than as imports because the claim being made about them is that the
 * REGISTRY carries them at this tier; an import would make that true by construction.
 */
const NEW_L3_IDS = ["d9.trg4.compound-evaluate.l3", "d9.trg9.compound-angle.l3"] as const;

const drawCache = new Map<string, FrozenItem[]>();

/** `count` deterministic draws of one template, memoised across the file. */
function draws(template: ItemTemplate, count: number): FrozenItem[] {
  const cacheKey = `${template.template_id}:${count}`;
  const held = drawCache.get(cacheKey);
  if (held) {
    return held;
  }
  const items = Array.from({ length: count }, (_unused, index) =>
    generateFromTemplate(template, "practice", SEED_BASE + index),
  );
  drawCache.set(cacheKey, items);
  return items;
}

/**
 * Every answer type a template is observed to SERVE, read off its own draws.
 *
 * A set rather than a single value because nothing stops a generator branching its answer
 * shape on a param — `d9.trg5.features.l3` already does, keying `numericAnswer` or
 * `exactRadianAnswer` to match the feature it drew. A template that served choose-one on one
 * branch in ten would be the same defect on a tenth of a node's hardest slot.
 */
function answerTypesOf(template: ItemTemplate): Set<string> {
  return new Set(
    draws(template, CENSUS_DRAWS).map((item) => item.answer.answer_spec.answer_type),
  );
}

/** A D9 practice template by id, resolved lazily so a missing shape fails one `it`. */
function templateFor(templateId: string): ItemTemplate {
  const found = D9_PRACTICE_TEMPLATES.find(
    (template) => template.template_id === templateId,
  );
  if (!found) {
    throw new Error(
      `${templateId} is not a D9 practice template; the D9 registry holds ${D9_PRACTICE_TEMPLATES.length} shapes`,
    );
  }
  return found;
}

describe("difficulty 3 really is D9's hardest tier", () => {
  it("tops every node out at L3, with two shapes sitting there", () => {
    expect(D9_PRACTICE_NODES.length, "all nine nodes are registered").toBe(9);
    for (const node of D9_PRACTICE_NODES) {
      const shapes = D9_PRACTICE_TEMPLATES.filter((template) => template.node_id === node);
      expect(shapes.length, `${node} has shapes at all`).toBeGreaterThanOrEqual(5);
      expect(
        Math.max(...shapes.map((template) => template.difficulty)),
        `${node}'s hardest shape is at L3, so "difficulty 3" is the hardest tier and not the second-hardest`,
      ).toBe(3);
      expect(
        LOCKED_TEMPLATES.filter(
          (template) => template.node_id === node && template.difficulty === 3,
        ).length,
        `${node} fills both hardest slots`,
      ).toBe(2);
    }
    // Nine nodes, two hardest shapes each. A filter that selected nothing, or that lost a
    // node, fails here rather than passing the sweeps below over an empty set.
    expect(
      L3_TEMPLATES.length,
      "the hardest-tier population is the whole domain's",
    ).toBeGreaterThanOrEqual(18);
    expect(
      new Set(L3_TEMPLATES.map((template) => template.node_id)).size,
      "and it spans every node, so no node has dropped out of the sweep",
    ).toBe(9);
    for (const node of D9_PRACTICE_NODES) {
      expect(
        L3_ITEMS.filter((item) => item.node_id === node).length,
        `${node} serves real hardest-tier instances, not just templates`,
      ).toBeGreaterThanOrEqual(8);
    }
  }, 60_000);
});

describe("no D9 item at the hardest tier is answered by choosing a printed option", () => {
  it("serves no multiple_choice answer from any L3 template", () => {
    const offenders = L3_TEMPLATES.filter((template) =>
      answerTypesOf(template).has("multiple_choice"),
    ).map((template) => template.template_id);
    expect(
      offenders,
      "a learner who knows nothing scores a third of the time on a choose-one, which is a floor the hardest slot on a node cannot carry; demote it and author an evaluation shape in its place",
    ).toEqual([]);
  }, 60_000);

  it("serves no multiple_choice answer from any L3 instance a learner can be given", () => {
    const offenders = L3_ITEMS.filter(
      (item) => item.answer.answer_spec.answer_type === "multiple_choice",
    ).map((item) => item.item_version_id);
    expect(
      offenders,
      "the frozen pool and its retry variants are what a learner actually meets",
    ).toEqual([]);
  });

  /**
   * The other direction, so the two assertions above are not green merely because D9 has
   * stopped serving choose-one items anywhere.
   *
   * The floor is two templates rather than the four the domain now holds, and deliberately
   * so: TRG.3's sign question and TRG.6's defined/undefined verdict sit outside this change
   * entirely, so a floor they alone satisfy keeps the reverse direction load-bearing even if
   * the two demoted naming shapes were later retired outright. The demotions push the real
   * count to four across four nodes.
   */
  it("still serves multiple_choice at L1 and L2, so the rule above is a tier rule", () => {
    const chooseOne = BELOW_L3_TEMPLATES.filter((template) =>
      answerTypesOf(template).has("multiple_choice"),
    );
    expect(
      chooseOne.length,
      "choose-one is genuinely in use below the hardest tier",
    ).toBeGreaterThanOrEqual(2);
    expect(
      new Set(chooseOne.map((template) => template.node_id)).size,
      "on more than one node, so this is not one file's habit standing in for a domain",
    ).toBeGreaterThanOrEqual(2);
    expect(
      BELOW_L3_ITEMS.filter(
        (item) => item.answer.answer_spec.answer_type === "multiple_choice",
      ).length,
      "and the served instances carry it too, not just the templates",
    ).toBeGreaterThanOrEqual(10);
  }, 60_000);
});

/**
 * The two shapes that took the vacated L3 slots.
 *
 * `d9.trg4.compound-evaluate.l3` gives one function value and a quadrant and asks for a
 * two-factor product that collapses to a single function, chaining parity, a reciprocal, the
 * quotient identity, the Pythagorean identity and a quadrant sign.
 * `d9.trg9.compound-angle.l3` gives two functions at two separate angles in two separate
 * quadrants and asks for a compound angle, which needs the Pythagorean identity twice, two
 * independent sign decisions and then the sum or difference formula.
 *
 * Both are checked over generated instances rather than by reading their sources, because a
 * step array and a prompt are built per draw and the source only shows the recipe.
 */
describe("the two new L3 shapes carry the work their tier claims", () => {
  /**
   * Named ids are how a claim quietly stops covering anything: rename a shape and every
   * assertion about it goes on passing over a template nobody serves. So the ids are checked
   * against the registry in both directions before anything is asserted of their draws.
   */
  it("names two shapes the registry actually holds, at the tier it claims for them", () => {
    for (const templateId of NEW_L3_IDS) {
      const template = templateFor(templateId);
      expect(template.difficulty, `${templateId} sits at the hardest tier`).toBe(3);
      expect(
        L3_TEMPLATES.map((entry) => entry.template_id),
        `${templateId} is inside the hardest-tier population this file sweeps`,
      ).toContain(templateId);
      expect(
        L3_ITEMS.filter((item) => item.template_id === templateId).length,
        `${templateId} is served rather than merely authored`,
      ).toBeGreaterThan(0);
    }
    // And the node each replaced a naming item on kept exactly two hardest shapes, so a slot
    // was taken over rather than added beside the one it replaced.
    for (const node of ["TRG.4", "TRG.9"]) {
      expect(
        LOCKED_TEMPLATES.filter(
          (template) => template.node_id === node && template.difficulty === 3,
        ).map((template) => template.template_id).length,
        `${node} still fills exactly two hardest slots`,
      ).toBe(2);
    }
  });

  it("walks every draw through at least four worked-solution steps", () => {
    for (const templateId of NEW_L3_IDS) {
      const template = templateFor(templateId);
      const samples = draws(template, L3_DRAWS);
      expect(samples.length, `${templateId} was sampled`).toBe(L3_DRAWS);
      for (const item of samples) {
        expect(
          item.worked_solution.length,
          `${templateId} reveals ${item.worked_solution.length} steps for ${JSON.stringify(item.template_params)}; a shape chaining four identities cannot be shown in fewer`,
        ).toBeGreaterThanOrEqual(4);
        for (const step of item.worked_solution) {
          expect(step.trim(), `${templateId} has an empty reveal step`).not.toBe("");
        }
      }
    }
  }, 60_000);
});

/**
 * The answer is never a value the prompt already printed.
 *
 * A compound shape hands over one or two readings and asks for something built out of them,
 * and the failure mode is an instance where the thing asked for happens to equal a thing
 * given: the learner reads the answer off the question and the whole chain of identities goes
 * untested. It is a property of the DRAW rather than of the recipe, so it is checked over two
 * hundred instances of each shape.
 *
 * ## Standalone, and why the prompt has to be rewritten before it can be matched
 *
 * `hint_leaks_answer` in `validate.ts` solves the same problem for hints: strip whitespace,
 * fold case, and match the key behind digit boundaries, so a key of `12/5` is not found inside
 * `112/5` or `12/53`. That boundary rule is reused verbatim below.
 *
 * What does not carry over is the alphabet. A hint is prose and prints `12/5`; a prompt is
 * KaTeX and prints `\dfrac{12}{5}`, so a matcher run against the raw prompt would find nothing
 * on any draw of any shape and report green for the same reason a broken sieve does. The
 * prompt is therefore reduced to the key's own grammar first, and the reduction is checked in
 * two ways rather than trusted: `printedValues` has its own assertions below, and every draw
 * is required to yield at least one printed value which the SAME matcher then finds. That
 * positive control is what makes the negative claim mean something — the matcher demonstrably
 * catches a value this prompt prints, and demonstrably does not catch the key.
 */
describe("neither new L3 shape prints its own answer in its prompt", () => {
  /** A prompt reduced to the value grammar an answer key is written in. */
  function printedValues(prompt: string): string {
    return prompt
      .replace(/\s+/g, "")
      .toLowerCase()
      .replace(/\\d?frac\{(-?\d+)\}\{(-?\d+)\}/g, "$1/$2");
  }

  /** `hint_leaks_answer`'s rule: the value, behind digit boundaries on both sides. */
  function printsAsStandaloneValue(text: string, value: string): boolean {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<!\\d)${escaped}(?!\\d)`).test(text);
  }

  /** Every fraction the reduced prompt states, which is what the matcher is aimed at. */
  function fractionsIn(reduced: string): readonly string[] {
    return reduced.match(/(?<!\d)-?\d+\/\d+(?!\d)/g) ?? [];
  }

  it("reduces a KaTeX fraction to the spelling a key is written in", () => {
    expect(printedValues("$\\cos\\theta = \\dfrac{5}{13}$")).toContain("5/13");
    expect(printedValues("$\\sin A = -\\dfrac{3}{5}$")).toContain("-3/5");
    expect(printedValues("$\\frac{56}{65}$")).toContain("56/65");
    // A radical fraction is left alone rather than mangled into a false value.
    expect(printedValues("$\\dfrac{\\sqrt{6}}{4}$")).not.toMatch(/\d+\/\d+/);
  });

  it("matches a value only where it stands alone", () => {
    expect(printsAsStandaloneValue("theansweris12/5", "12/5")).toBe(true);
    expect(printsAsStandaloneValue("112/5", "12/5")).toBe(false);
    expect(printsAsStandaloneValue("12/53", "12/5")).toBe(false);
    expect(printsAsStandaloneValue("given5/13find-56/65", "-56/65")).toBe(true);
  });

  it("never states the key among the values it hands the learner", () => {
    for (const templateId of NEW_L3_IDS) {
      const template = templateFor(templateId);
      const samples = draws(template, L3_DRAWS);
      let controls = 0;
      for (const item of samples) {
        const key = String(item.answer.answer_key ?? "");
        expect(key, `${templateId} grades against a key`).not.toBe("");
        const reduced = printedValues(item.prompt);
        const printed = fractionsIn(reduced);
        // The positive control: this prompt does print values, and the matcher finds them.
        // Without it the assertion beneath could pass over a string no value can match.
        expect(
          printed.length,
          `${templateId} prints no value at all, so the sweep below would catch nothing: ${item.prompt}`,
        ).toBeGreaterThan(0);
        for (const value of printed) {
          expect(
            printsAsStandaloneValue(reduced, value),
            `${templateId}'s matcher cannot find "${value}", which its own prompt prints`,
          ).toBe(true);
        }
        controls += printed.length;
        expect(
          printsAsStandaloneValue(reduced, key),
          `${templateId} prints its own answer "${key}" among the values it gives: ${item.prompt}`,
        ).toBe(false);
      }
      expect(
        controls,
        `${templateId}'s positive control ran on every draw`,
      ).toBeGreaterThanOrEqual(samples.length);
    }
  }, 60_000);
});
