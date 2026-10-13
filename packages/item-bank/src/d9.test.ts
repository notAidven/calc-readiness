import { createProductAnswerChecker } from "@cr/components";
import { describe, expect, it } from "vitest";

import { toProductItemVersions } from "./bank";
import { D1_ITEM_PACK, D1_PRACTICE_ITEMS, D1_WALK_ITEM_PACK } from "./d1";
import { D2_PRACTICE_ITEMS } from "./d2";
import { D5_PRACTICE_ITEMS } from "./d5";
import { D7_PRACTICE_ITEMS } from "./d7";
import {
  buildRandomizedD9PracticeSet,
  D3_PRACTICE_ITEMS,
  D4_PRACTICE_ITEMS,
  D8_PRACTICE_ITEMS,
  D9_EXTRA_PRACTICE_TEMPLATES,
  D9_PRACTICE_ITEMS,
  D9_PRACTICE_MIX,
  D9_PRACTICE_NODES,
  D9_PRACTICE_POOL,
  D9_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D9_PRACTICE_TEMPLATES,
  D9_PRACTICE_VARIANTS,
  D10_PRACTICE_ITEMS,
  drawD9PracticeInstance,
  TRG1_TEMPLATES,
  TRG2_TEMPLATES,
  TRG3_TEMPLATES,
  TRG4_TEMPLATES,
  TRG5_TEMPLATES,
  TRG6_TEMPLATES,
  TRG7_TEMPLATES,
  TRG8_TEMPLATES,
  TRG9_TEMPLATES,
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
 * The D9 (Trigonometry) practice pool. It pins the five-slot pool per node and proves the
 * pool self-validates through the v2 PRODUCT checker, composes the locked five-slot mix,
 * reshuffles without repeating a problem SHAPE, and is isolated from every other pool
 * including the frozen TRG.2 product ASSESSMENT item, which this slice never touches.
 *
 * **Every sweep here passes `PRODUCT_CHECKER_CONFIG` deliberately.** `validateTemplates`
 * defaults to the D1 v1 checker, which cannot grade a single D9 answer type: the
 * `canonical_exact_trig_value` profile comes back `unsupported_simplification_profile`, and
 * a first run under the default reports around a hundred spurious errors that look like
 * authoring faults. Two authors lost time to this before it was written down.
 *
 * Four D9-specific invariants are asserted below rather than left to a reader's care. Each
 * one is a defect this domain actually shipped and had repaired, not a hypothetical:
 *
 *  - **No practice item is multipart.** There is no multi-field answer input in `apps/web`,
 *    so a multipart practice item cannot be answered at all.
 *  - **Every choose-one key is lower case.** The answer field folds case before grading, so
 *    a capital in a key makes the item unwinnable.
 *  - **No roster or interval holds a pi.** Those two shapes cannot parse one, so the domain
 *    asks a single angle in radians and a SET of them in degrees.
 *  - **The thin cells are named.** Several trigonometric shapes have a genuinely small
 *    answer space, and an unnamed shortfall is indistinguishable from a broken generator.
 */

/** The answer types each node is allowed to serve. */
const NODE_ANSWER_TYPES: Readonly<Record<string, readonly string[]>> = {
  "TRG.1": ["numeric"],
  "TRG.2": ["numeric"],
  "TRG.3": ["numeric", "multiple_choice"],
  "TRG.4": ["numeric", "multiple_choice"],
  "TRG.5": ["numeric"],
  "TRG.6": ["numeric", "solution_set", "multiple_choice"],
  "TRG.7": ["numeric", "interval"],
  "TRG.8": ["solution_set", "numeric"],
  "TRG.9": ["numeric", "multiple_choice"],
};

/** Every D9 template, so a sweep cannot silently skip a node. */
const ALL_D9_TEMPLATES: readonly ItemTemplate[] = D9_PRACTICE_TEMPLATES;

/**
 * The locked-mix templates only: the nine nodes' own five-shape arrays, without the extra
 * shapes appended after them.
 *
 * The MIX is a claim about the five frozen slots per node and not about how many shapes are
 * available to fill them, so it is derived from these rather than from the whole aggregate. The
 * pool-level `validatePracticePool` below asserts the frozen counts exactly, which is where the
 * mix actually lives; an extra shape widens what a slot can serve and moves no slot.
 */
const LOCKED_D9_TEMPLATES: readonly ItemTemplate[] = ALL_D9_TEMPLATES.filter(
  (template) => !D9_EXTRA_PRACTICE_TEMPLATES.includes(template),
);

/** Every authored pool in the bank EXCEPT D9, for the isolation and census sweeps. */
const EVERY_OTHER_POOL: readonly FrozenItem[] = [
  ...D1_ITEM_PACK,
  ...D1_PRACTICE_ITEMS,
  ...D1_WALK_ITEM_PACK,
  ...D2_PRACTICE_ITEMS,
  ...D3_PRACTICE_ITEMS,
  ...D4_PRACTICE_ITEMS,
  ...D5_PRACTICE_ITEMS,
  ...D7_PRACTICE_ITEMS,
  ...D8_PRACTICE_ITEMS,
  ...D10_PRACTICE_ITEMS,
  ...INTERACTIVE_PRACTICE_ITEMS,
  ...PRODUCT_ITEM_PACK,
];

describe("D9 practice templates (Trigonometry)", () => {
  it("authors every node's templates under its real node id with d9 ids", () => {
    const byNode: readonly (readonly [string, readonly ItemTemplate[], string])[] = [
      ["TRG.1", TRG1_TEMPLATES, "d9.trg1."],
      ["TRG.2", TRG2_TEMPLATES, "d9.trg2."],
      ["TRG.3", TRG3_TEMPLATES, "d9.trg3."],
      ["TRG.4", TRG4_TEMPLATES, "d9.trg4."],
      ["TRG.5", TRG5_TEMPLATES, "d9.trg5."],
      ["TRG.6", TRG6_TEMPLATES, "d9.trg6."],
      ["TRG.7", TRG7_TEMPLATES, "d9.trg7."],
      ["TRG.8", TRG8_TEMPLATES, "d9.trg8."],
      ["TRG.9", TRG9_TEMPLATES, "d9.trg9."],
    ];
    for (const [nodeId, templates, prefix] of byNode) {
      expect(templates.length, nodeId).toBeGreaterThanOrEqual(5);
      for (const template of templates) {
        expect(template.node_id, template.template_id).toBe(nodeId);
        expect(template.template_id.startsWith(prefix), template.template_id).toBe(true);
      }
    }
    expect(ALL_D9_TEMPLATES).toHaveLength(
      byNode.reduce((total, [, templates]) => total + templates.length, 0) +
        D9_EXTRA_PRACTICE_TEMPLATES.length,
    );
    // The extra shapes are held to the same two properties the sweep above enforces, and to
    // being APPENDED, which is what keeps every already-frozen pool slot and retry variant on
    // its own seed.
    expect(D9_EXTRA_PRACTICE_TEMPLATES.length).toBeGreaterThan(0);
    for (const template of D9_EXTRA_PRACTICE_TEMPLATES) {
      expect(D9_PRACTICE_NODES, template.template_id).toContain(template.node_id);
      expect(template.template_id.startsWith("d9."), template.template_id).toBe(true);
    }
    expect(
      ALL_D9_TEMPLATES.slice(LOCKED_D9_TEMPLATES.length).map((t) => t.template_id),
    ).toEqual(D9_EXTRA_PRACTICE_TEMPLATES.map((t) => t.template_id));
  });

  it("authors all nine nodes", () => {
    expect(D9_PRACTICE_NODES).toHaveLength(9);
    for (const node of D9_PRACTICE_NODES) {
      expect(
        LOCKED_D9_TEMPLATES.filter((t) => t.node_id === node),
        node,
      ).toHaveLength(5);
    }
    // The registered nodes are exactly the ones with templates, so no node in the pool can
    // be missing a shape and no shape can belong to an unregistered node.
    expect([...D9_PRACTICE_NODES].sort()).toEqual(
      [...new Set(ALL_D9_TEMPLATES.map((t) => t.node_id))].sort(),
    );
  });

  it("composes the locked 1xL1 / 2xL2 / 2xL3 mix from distinct shapes at each level", () => {
    for (const node of D9_PRACTICE_NODES) {
      const templates = LOCKED_D9_TEMPLATES.filter((t) => t.node_id === node);
      for (const [difficulty, expected] of [
        [1, 1],
        [2, 2],
        [3, 2],
      ] as const) {
        const atLevel = templates.filter((t) => t.difficulty === difficulty);
        expect(atLevel.length, `${node} L${difficulty}`).toBe(expected);
        // Two slots must be fillable by two genuinely different problem shapes.
        expect(
          new Set(atLevel.map((t) => t.template_id)).size,
          `${node} L${difficulty}`,
        ).toBe(expected);
      }
    }
  });

  // Exact-value and precision compares run through mathjs and cost far more per item than a
  // plain numeric compare, so these sweeps need more than vitest's 5s default (see
  // d5.test.ts, d7.test.ts, d8.test.ts and product.test.ts, which budget the same way).
  it("every sampled instance of EVERY template self-validates through the v2 product checker", () => {
    expect(validateTemplates(ALL_D9_TEMPLATES, 40, PRODUCT_CHECKER_CONFIG)).toEqual([]);
  }, 120_000);

  it("the frozen practice pool composes the five-slot mix and self-validates", () => {
    expect(
      validatePracticePool(
        D9_PRACTICE_POOL,
        { nodes: D9_PRACTICE_NODES, mix: D9_PRACTICE_MIX },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  }, 120_000);

  it("every retry variant is a distinct, gradable practice item too", () => {
    expect(D9_PRACTICE_VARIANTS.length).toBeGreaterThan(D9_PRACTICE_POOL.length);
    expect(
      validatePracticePool(
        D9_PRACTICE_VARIANTS,
        { nodes: [], mix: [] },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  }, 120_000);
});

describe("D9 answers stay in shapes a learner can actually submit", () => {
  it("serves each node only its allowed answer types", () => {
    for (const [nodeId, allowed] of Object.entries(NODE_ANSWER_TYPES)) {
      const items = D9_PRACTICE_ITEMS.filter((item) => item.node_id === nodeId);
      expect(items.length, nodeId).toBeGreaterThan(0);
      for (const item of items) {
        expect(allowed, item.item_version_id).toContain(
          item.answer.answer_spec.answer_type,
        );
      }
    }
  });

  /**
   * **No practice item may be multipart, because no surface can submit one.** `apps/web/src`
   * contains no occurrence of `multipart` or `part_id`: there is no multi-field input, and
   * both practice surfaces submit a string, while `compareMultipart` requires an object keyed
   * by `part_id`. So a multipart practice item returns `invalid_multipart_answer` to
   * everything a learner can type. It is not graded harshly, it cannot be answered.
   *
   * Two D9 templates were authored this way and reshaped to ask for one named part. The
   * assertion is bank-wide rather than D9-only, because the defect is a property of the
   * practice SURFACE and any domain can walk into it.
   *
   * Asserted in both directions. The product assessment item genuinely is multipart and is
   * graded by a different path, so it is named here rather than quietly excluded: if it stops
   * being multipart this fails, and the sweep above stops proving anything the day the
   * distinction disappears.
   */
  it("serves no multipart item from any practice pool, while the assessment path keeps one", () => {
    const practiceItems = [...D9_PRACTICE_ITEMS, ...EVERY_OTHER_POOL].filter(
      (item) => !PRODUCT_ITEM_PACK.includes(item),
    );
    expect(practiceItems.length, "the practice population is not empty").toBeGreaterThan(
      200,
    );
    for (const item of practiceItems) {
      expect(item.answer.answer_spec.answer_type, item.item_version_id).not.toBe(
        "multipart",
      );
    }
    const assessmentMultipart = PRODUCT_ITEM_PACK.filter(
      (item) => item.answer.answer_spec.answer_type === "multipart",
    );
    expect(
      assessmentMultipart.length,
      "the assessment path still has the multipart shape this rule is distinguishing from",
    ).toBeGreaterThan(0);
  });

  /**
   * **Every choose-one key must be lower case, bank-wide.** The checker compares a
   * `multiple_choice` answer with a bare `===`, but `normalizeTextSubmission` lower-cases
   * every choose-one submission on the way in, and it is the only route to the grader from
   * all three surfaces that serve practice. A key carrying a capital cannot be matched by
   * anything a learner types.
   *
   * TRG.4 shipped a capitalized `Pythagorean` for exactly one day. Nothing caught it:
   * `validateTemplates` submits the canonical key directly and never crosses the fold, so the
   * node validated clean with a third of that slot's draws unanswerable.
   *
   * Swept over every pool rather than over D9, because the population that owes this property
   * is "every item a learner picks an option on", which is a fact about the surface and not
   * about which domain happened to introduce choose-one items.
   */
  it("keys every choose-one answer in lower case, bank-wide", () => {
    const choices = [...D9_PRACTICE_ITEMS, ...EVERY_OTHER_POOL].filter(
      (item) => item.answer.answer_spec.answer_type === "multiple_choice",
    );
    expect(choices.length, "there are choose-one items to check").toBeGreaterThanOrEqual(
      20,
    );
    // And the sweep genuinely reaches D9, rather than passing on older domains alone.
    expect(
      choices.filter((item) => item.template_id.startsWith("d9.")).length,
      "D9's choose-one items are inside the population",
    ).toBeGreaterThanOrEqual(3);
    for (const item of choices) {
      const key = item.answer.answer_key ?? "";
      expect(key, item.item_version_id).toBe(key.toLowerCase());
      expect(key.trim(), item.item_version_id).toBe(key);
    }
  });

  /**
   * **A roster and an interval cannot hold a pi**, so the domain asks a SINGLE angle in exact
   * radians and a SET of them in degrees. This is the split that runs the length of TRG.6,
   * TRG.7 and TRG.8, and it is the one a later "consistency" pass is most likely to undo by
   * moving a roster into radians to match its neighbours.
   *
   * The floors matter as much as the rule: containment holds trivially over an empty
   * collection, so without them this would pass on a domain that had lost its rosters.
   */
  it("keeps pi out of every roster and interval, while still asking radians elsewhere", () => {
    const setShapes = D9_PRACTICE_ITEMS.filter((item) =>
      ["solution_set", "interval"].includes(item.answer.answer_spec.answer_type),
    );
    expect(
      setShapes.length,
      "D9 really does serve rosters and intervals",
    ).toBeGreaterThanOrEqual(10);
    for (const item of setShapes) {
      expect(item.answer.answer_key ?? "", item.item_version_id).not.toContain("pi");
    }
    // The other half of the split: single angles ARE asked in exact radians, so the rule
    // above is a division of labour rather than a domain that quietly gave up on radians.
    const radians = D9_PRACTICE_ITEMS.filter((item) =>
      (item.answer.answer_key ?? "").includes("pi"),
    );
    expect(
      radians.length,
      "single angles are still asked in exact radians",
    ).toBeGreaterThanOrEqual(10);
    for (const item of radians) {
      expect(item.answer.answer_spec.answer_type, item.item_version_id).toBe("numeric");
    }
  });
});

/**
 * The reveal is the one surface a learner copies a spelling from, so a form printed there and
 * refused by the answer field costs them the attempt on a question they got right.
 *
 * This shipped. Both roster shapes closed on $\{60^{\circ},\; 120^{\circ}\}$ while their own
 * prompts said to write the numbers only with no degree sign, and typing what the reveal
 * showed returns `invalid_input/unknown_symbol` — scored as a format failure rather than as a
 * wrong answer, so the learner is told nothing about their mathematics.
 *
 * Both halves are asserted, because either alone proves nothing. The refusal is measured
 * through the REAL v2 checker over the served items, which is what makes advertising the
 * typed form load bearing rather than decorative; and every roster and interval item is
 * required to print that typed form somewhere in its reveal. A floor and a composition check
 * sit under both, since a containment sweep over an empty population passes, and a population
 * that had lost one of its two answer shapes would still clear a bare count.
 */
describe("D9 reveals advertise a form the answer field actually takes", () => {
  const checker = createProductAnswerChecker({
    itemVersions: toProductItemVersions(D9_PRACTICE_ITEMS),
  });

  /** Every served item whose key is a roster or an interval of bare degree measures. */
  const degreeShapes = D9_PRACTICE_ITEMS.filter((item) =>
    ["solution_set", "interval"].includes(item.answer.answer_spec.answer_type),
  );

  /** The same answer with a degree sign glued to every number, as the reveal used to print it. */
  const withDegreeSigns = (key: string): string => key.replace(/(-?\d+)/g, "$1°");

  it("serves both degree-answered shapes, from both nodes that carry a roster", () => {
    expect(
      degreeShapes.filter((item) => item.answer.answer_spec.answer_type === "solution_set")
        .length,
      "rosters are in the population",
    ).toBeGreaterThanOrEqual(25);
    expect(
      degreeShapes.filter((item) => item.answer.answer_spec.answer_type === "interval")
        .length,
      "intervals are in the population",
    ).toBeGreaterThanOrEqual(5);
    for (const node of ["TRG.6", "TRG.8"]) {
      expect(
        degreeShapes.filter((item) => item.node_id === node).length,
        `${node} contributes rosters`,
      ).toBeGreaterThan(0);
    }
  });

  it("refuses the degree-signed spelling, which is why the typed form has to be shown", () => {
    for (const item of degreeShapes) {
      const key = item.answer.answer_key ?? "";
      const result = checker({
        raw_answer: withDegreeSigns(key),
        item_version_id: item.item_version_id,
        equivalence_checker_version: PRODUCT_CHECKER_CONFIG.checkerVersion,
      });
      expect(
        result.status,
        `${item.item_version_id} answered "${withDegreeSigns(key)}"`,
      ).not.toBe("correct");
    }
  });

  it("prints the typed form in the worked solution of every roster and interval", () => {
    for (const item of degreeShapes) {
      const key = item.answer.answer_key ?? "";
      expect(
        item.worked_solution.some((step) => step.includes(key)),
        `${item.template_id} (${item.item_version_id}) reveals the spelling "${key}" it wants typed`,
      ).toBe(true);
    }
  });

  /**
   * The same rule one field over (R30). A bare numeric field has no keypad and no live
   * preview, so a learner asked for an angle "in degrees" and given nowhere to read the
   * grammar off types `30°`, and the field returns `invalid_input/parse_error` — again a
   * format failure rather than a wrong answer.
   *
   * **The population is derived from the behaviour rather than from the file.** A surface
   * exhibits this defect when it takes a free-text answer AND asks for that answer as a
   * degree measure, so it is every served item with a `numeric` answer type whose prompt says
   * "in degrees". Both halves are needed and neither is the implementation: a roster is
   * excluded because it is a different answer grammar with its own rule above, and radians
   * are excluded because no degree sign is on offer.
   *
   * The competing derivation was measured and rejected rather than argued away. Scoping by
   * "the worked solution's last step prints a degree mark" looks equivalent and captured four
   * templates more — `d9.trg3.exact-value-circle.l3`, `d9.trg6.reciprocal-exact.l3`,
   * `d9.trg9.sum-exact.l1` and `d9.trg9.difference-exact.l2` — every one of which merely
   * NAMES an angle on the way to answering with a coordinate or a radical. It is the answer
   * that has to be a degree measure, not the reasoning. In the other direction the two agree
   * exactly, so no template asks for degrees without saying so.
   *
   * The last of those four has since been retired in the tier rebalance, so that comparison is
   * a record of a measurement at the SHA it was taken rather than a live census. It is left as
   * written because what it documents is the ARGUMENT for the derivation below, which the
   * retirement does not touch; the three survivors still make the point on their own.
   */
  const degreeFields = D9_PRACTICE_ITEMS.filter(
    (item) =>
      item.answer.answer_spec.answer_type === "numeric" && /in degrees/.test(item.prompt),
  );

  it("asks every bare degree field for a bare number, with no exceptions", () => {
    expect(
      new Set(degreeFields.map((item) => item.template_id)).size,
      "the degree-answered bare fields are a real population",
    ).toBeGreaterThanOrEqual(7);
    expect(
      degreeFields.length,
      "and it is the served items, not just the templates",
    ).toBeGreaterThanOrEqual(40);
    expect(
      new Set(degreeFields.map((item) => item.node_id)).size,
      "spanning more than one node, so this is not one file's habit",
    ).toBeGreaterThanOrEqual(4);

    for (const item of degreeFields) {
      expect(
        item.prompt,
        `${item.template_id} (${item.item_version_id}) tells the learner the field takes no degree sign`,
      ).toContain("with no degree sign");
    }
  });
});

/**
 * The variety guard. Every D9 template declares a `varietyKey`, and both freezers honour it.
 * This domain needs it more than most: the special angles are a small lattice, so several
 * shapes reach the same heading by different routes and a content-hash check alone would
 * happily freeze two instances of one question in a cell.
 */
describe("D9 variety guard (a cell never holds two instances of the same question)", () => {
  const templateById = new Map(ALL_D9_TEMPLATES.map((t) => [t.template_id, t]));

  function varietyOf(item: FrozenItem): string | undefined {
    return templateById.get(item.template_id)?.varietyKey?.(item.template_params);
  }

  it("declares a varietyKey on every template", () => {
    for (const template of ALL_D9_TEMPLATES) {
      expect(typeof template.varietyKey, template.template_id).toBe("function");
    }
  });

  it("gives every item in a (node, difficulty) cell a distinct variety key", () => {
    const byCell = new Map<string, string[]>();
    for (const item of D9_PRACTICE_POOL) {
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
    for (const item of D9_PRACTICE_VARIANTS) {
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
   * Retry depth, with the thin cells named rather than excused by a loose floor.
   *
   * `buildVariants` gives up after 200 misses, so a template whose answer space is smaller
   * than {@link D9_PRACTICE_RETRY_VARIANTS_PER_CELL} under-delivers silently. In most domains
   * that is a broken generator. In trigonometry it is often the mathematics: only three sines
   * are exact and positive, and only two radicals are reachable from the sum and difference
   * formulas, so some cells genuinely cannot hold six distinct questions.
   *
   * A template that cannot and a template that broke look identical from outside, so each
   * short one is listed with its measured ceiling and the reason it is short. Asserted in
   * BOTH directions: a listed template that stops matching its number fails, whether it
   * thinned further or grew, and an unlisted template that under-delivers fails too. So the
   * list cannot sit here excusing a shortfall that has changed size, and a generator cannot
   * quietly lose depth by being absent from it.
   *
   * **What this list does NOT cover.** Its numbers are distinct variety keys, which are
   * distinct QUESTIONS. Whether a retry can say something new is a fact about distinct
   * ANSWERS, and a cell can be full on the first count and threadbare on the second, so this
   * list is silent on the defect a learner actually meets. `THIN_ANSWER_CELLS` above holds
   * that quantity and the reveal-to-retry assertion above holds the consequence. Read a green
   * run here as "no generator has quietly lost the ability to build fresh questions" and
   * nothing more.
   */
  const THIN_CELLS: Readonly<Record<string, number>> = {
    // Only three sines are exact AND positive, and a negative value is L2's shape while a
    // non-special heading is ungradable, so this cell cannot be widened without moving tier.
    "d9.trg8.sine-basic.l1": 2,
    "d9.trg8.cosine-negative.l2": 2,
    "d9.trg8.tangent-basic.l2": 5,
    "d9.trg8.linear-in-trig.l3": 5,
    // The sum formula reaches exactly two radicals over the authorable angles, and `cos 105` is
    // excluded as a third shape the checker spike never measured. Its difference twin used to
    // sit beside this line at 3 and was retired when the naming shape came down to L2, so the
    // ceiling below is now the last of that pair rather than one of two.
    "d9.trg9.sum-exact.l1": 5,
    // The principal ranges are a fixed, small set of intervals.
    "d9.trg7.range-interval.l2": 5,
  };

  /**
   * The learner-facing half of retry depth, and the reason the list below is not it.
   *
   * A reveal shows the answer; the retry button then offers another go. Serving an instance
   * with the SAME answer turns that into a coin flip the learner has already been given the
   * result of, and in a two-answer cell the base rate is 50%. Measured at `24493680` by
   * walking every served instance through the draw the product actually performs: **30 of 300
   * pairs, 10.0%**, worst at `d9.trg6.secant-defined.l2`, where 5 of its 7 instances retried
   * to the verdict just revealed.
   *
   * `THIN_CELLS` could not see any of it, and this is the population-scoping trap in
   * `.cursor/rules/qa-verification.mdc` rather than a hole in its construction: it counts
   * distinct variety keys, which are distinct PROMPTS, and the defect is a fact about
   * distinct ANSWERS. Those two come apart, so three of the four worst offenders sat at full
   * prompt depth and outside the list entirely. Both quantities are now asserted, separately
   * and under their own names.
   */
  it("never retries a revealed item into the answer it just revealed", () => {
    let pairs = 0;
    for (const revealed of D9_PRACTICE_ITEMS) {
      const fresh = drawD9PracticeInstance(revealed.node_id, revealed.difficulty, {
        avoid: [revealed.item_version_id],
        templateId: revealed.template_id,
      });
      if (!fresh) {
        continue;
      }
      pairs += 1;
      expect(
        fresh.answer.answer_key ?? "",
        `retrying ${revealed.item_version_id} served ${fresh.item_version_id}, whose answer is the one just revealed`,
      ).not.toBe(revealed.answer.answer_key ?? "");
    }
    // Without this a cell that stopped offering retries at all would pass by serving none.
    expect(pairs, "every served instance offers a retry").toBe(D9_PRACTICE_ITEMS.length);
    expect(pairs, "and there are enough of them to mean something").toBeGreaterThanOrEqual(
      300,
    );
  });

  /**
   * Distinct ANSWERS a cell can serve, for the cells that cannot reach
   * {@link D9_PRACTICE_RETRY_VARIANTS_PER_CELL} of them.
   *
   * This is `THIN_CELLS` re-scoped onto the quantity the learner meets. Where that list
   * records how many distinct QUESTIONS a generator can build, this records how many distinct
   * ANSWERS those questions carry between them, which is what decides whether a retry chain
   * can keep saying something new. A cell can be perfectly healthy on the first count and
   * threadbare on the second: `d9.trg6.secant-defined.l2` builds its full six prompts out of
   * two verdicts.
   *
   * Every number is measured, and most of them are the mathematics rather than a shortfall:
   * a choose-one shape has as many answers as it has options, and the sum and difference
   * formulas reach exactly two radicals over the authorable special angles. Asserted in both
   * directions like its sibling, so a cell that loses answer variety fails whether or not it
   * is listed, and a listed cell that gains some fails until its number is corrected.
   */
  const THIN_ANSWER_CELLS: Readonly<Record<string, number>> = {
    // Three option words, three answers; likewise the three principal ranges.
    //
    // The two naming shapes moved from L3 to L2 in the tier rebalance, and their ceilings came
    // with them unchanged, which was measured rather than assumed: moving a template between
    // cells changes which retry variants get drawn, so a number that happened to survive the
    // move is a different claim from one that had to.
    "d9.trg7.range-interval.l2": 3,
    "d9.trg9.formula-name.l2": 3,
    // Three families to sort a line into, so three keys, and the reason this is a ruling now
    // rather than an entry in the unruled list below: that list's stated excuse was that TRG.4
    // was being edited by another lane while it was written, and TRG.4 has settled.
    "d9.trg4.identity-name.l2": 3,
    // Two verdicts, `defined` and `undefined`, and nothing else to report.
    "d9.trg6.secant-defined.l2": 2,
    // Only three sines are exact AND positive, and a negative value is L2's shape, so these
    // two exhaust their spaces at three headings each. The whole cell is three instances.
    "d9.trg8.sine-basic.l1": 3,
    "d9.trg8.cosine-negative.l2": 3,
    // The sum formula reaches exactly two radicals over the authorable angles, so six distinct
    // prompts share two answers between them. This is the one entry here whose ceiling is an
    // authoring limit rather than the mathematics: widening it needs a third graded key
    // (`(sqrt(2)-sqrt(6))/4`, from `cos 105`), which the checker spike never measured and which
    // `renderCombine` cannot currently spell. Its difference twin sat here at 2 for the same
    // reason and is retired; `compound-angle.l3` replaced it and needs no entry, reaching seven
    // distinct answers over seven served items because its values are rational rather than
    // drawn from that two-radical set.
    "d9.trg9.sum-exact.l1": 2,
    // Four functions over two inside coefficients, several of which share a roster.
    "d9.trg6.asymptote-degree.l2": 4,
    // Two entries stood here at 5, `d9.trg6.reciprocal-exact.l3` and
    // `d9.trg7.compose-principal.l3`, on the reasoning that the special angles repeat their
    // values across quadrants so the reciprocal lattice and the composition table each land on
    // five. Both are gone, which is the direction an exemption is supposed to move in.
    //
    // Neither 5 was a ceiling. Both cells were landing there because `buildVariants` deduped
    // its six draws by QUESTION and let two of them carry the same answer, so what those
    // entries recorded was an artefact of where a shared seed happened to be rather than a
    // limit of the mathematics. With that function preferring a fresh answer wherever the
    // question space has room, the two cells now serve 7 and 6 distinct answers and neither
    // needs excusing.
  };

  /**
   * Cells that are short but whose ceiling this round has not ruled on, because they sit in
   * another fixer's lane and were being edited while this was written.
   *
   * They are named rather than dropped, so the sweep stays scoped to the behaviour instead
   * of to the four nodes one fixer happened to own. What is asserted of them is deliberately
   * weaker than an exact pin, and the reason is evidence rather than ownership: a ceiling
   * measured against a tree that is being written to is a reading, not a ruling. Two
   * consecutive censuses minutes apart disagreed about `d9.trg5.amplitude.l1`, which was
   * widened to the full budget between them, so pinning these numbers now would fail on
   * somebody else's correct fix rather than on a defect.
   *
   * What holds: each still exists, each still serves more than one answer, and the list
   * cannot grow without its size assertion failing. **Its ceilings are owed a ruling once
   * the D9 QA lanes have settled** — promote each into {@link THIN_ANSWER_CELLS} with its
   * measured number, which restores the both-ways contract its siblings have.
   */
  const UNRULED_ANSWER_CELLS: readonly string[] = [
    "d9.trg2.ratio-from-sides.l1",
    "d9.trg2.special-exact.l2",
    "d9.trg2.exact-side-radical.l3",
    "d9.trg3.quadrant-sign.l2",
    "d9.trg3.reference-radian.l2",
    "d9.trg5.phase-shift.l3",
  ];

  it("serves the full retry budget of distinct ANSWERS except in the named cells", () => {
    const answerDepthOf = (templateId: string): number =>
      new Set(
        D9_PRACTICE_ITEMS.filter((item) => item.template_id === templateId).map(
          (item) => item.answer.answer_key ?? `spec:${item.item_version_id}`,
        ),
      ).size;

    // Nothing may be claimed as both ruled and unruled.
    for (const templateId of UNRULED_ANSWER_CELLS) {
      expect(
        THIN_ANSWER_CELLS[templateId],
        `${templateId} is declared once, not in both lists`,
      ).toBeUndefined();
    }

    for (const template of ALL_D9_TEMPLATES) {
      const declared = THIN_ANSWER_CELLS[template.template_id];
      if (declared !== undefined) {
        expect(answerDepthOf(template.template_id), template.template_id).toBe(declared);
      } else if (!UNRULED_ANSWER_CELLS.includes(template.template_id)) {
        expect(
          answerDepthOf(template.template_id),
          `${template.template_id} carries a distinct answer for every retry`,
        ).toBeGreaterThanOrEqual(D9_PRACTICE_RETRY_VARIANTS_PER_CELL);
      }
    }

    const known = new Set(ALL_D9_TEMPLATES.map((t) => t.template_id));
    for (const templateId of [...Object.keys(THIN_ANSWER_CELLS), ...UNRULED_ANSWER_CELLS]) {
      expect(
        known.has(templateId),
        `${templateId} is a declared thin-answer cell that still exists`,
      ).toBe(true);
    }

    for (const templateId of UNRULED_ANSWER_CELLS) {
      expect(
        answerDepthOf(templateId),
        `${templateId} still serves more than one answer`,
      ).toBeGreaterThan(1);
    }
    // Pinned, so an unruled cell cannot be added without saying so here. Six since the tier
    // rebalance promoted `d9.trg4.identity-name` into the ruled list above with its measured
    // three, which is the direction this list is supposed to move in.
    expect(
      UNRULED_ANSWER_CELLS.length,
      "the unruled list has not grown; a new short cell owes a ruling, not an entry",
    ).toBe(6);

    expect(
      ALL_D9_TEMPLATES.length -
        Object.keys(THIN_ANSWER_CELLS).length -
        UNRULED_ANSWER_CELLS.length,
      "most templates still carry a distinct answer for every retry",
    ).toBeGreaterThanOrEqual(25);
  });

  it("delivers full retry depth everywhere except the named thin cells", () => {
    const depthOf = (templateId: string): number =>
      D9_PRACTICE_VARIANTS.filter((item) => item.template_id === templateId).length;

    for (const template of ALL_D9_TEMPLATES) {
      const declared = THIN_CELLS[template.template_id];
      const expected = declared ?? D9_PRACTICE_RETRY_VARIANTS_PER_CELL;
      expect(depthOf(template.template_id), template.template_id).toBe(expected);
    }

    // Every listed id is a template that still exists, so a renamed or deleted shape cannot
    // leave an entry here excusing nothing.
    const known = new Set(ALL_D9_TEMPLATES.map((t) => t.template_id));
    for (const templateId of Object.keys(THIN_CELLS)) {
      expect(
        known.has(templateId),
        `${templateId} is a declared thin cell that still exists`,
      ).toBe(true);
    }

    // And the exception list has not swallowed the population it is an exception to.
    expect(
      ALL_D9_TEMPLATES.length - Object.keys(THIN_CELLS).length,
      "most templates still deliver the full retry depth",
    ).toBeGreaterThanOrEqual(30);
  });
});

describe("D9 practice set (reshuffle without repeating a shape)", () => {
  const seededRng = () => {
    let seed = 1;
    return () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };
  };

  it("draws a distinct five-slot set in the locked easy-to-hard mix, for every node", () => {
    const rng = seededRng();
    for (const node of D9_PRACTICE_NODES) {
      for (let run = 0; run < 8; run += 1) {
        const set = buildRandomizedD9PracticeSet(node, rng);
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
    for (const node of D9_PRACTICE_NODES) {
      for (let run = 0; run < 30; run += 1) {
        const set = buildRandomizedD9PracticeSet(node, rng);
        for (const { difficulty } of D9_PRACTICE_MIX) {
          const slots = set.filter((item) => item.difficulty === difficulty);
          const shapesAvailable = new Set(
            D9_PRACTICE_ITEMS.filter(
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
      for (const item of buildRandomizedD9PracticeSet("TRG.1", rng)) {
        seen.add(item.item_version_id);
      }
    }
    expect(seen.size).toBeGreaterThan(5);
  });
});

describe("D9 pool isolation (never touches the frozen TRG.2 assessment or any other pool)", () => {
  it("shares no id or content with any other authored pool", () => {
    const otherIds = new Set(EVERY_OTHER_POOL.map((item) => item.item_version_id));
    const otherHashes = new Set(EVERY_OTHER_POOL.map(hashItemDefinition));
    for (const item of D9_PRACTICE_ITEMS) {
      expect(otherIds.has(item.item_version_id), item.item_version_id).toBe(false);
      expect(otherHashes.has(hashItemDefinition(item)), item.item_version_id).toBe(false);
    }
  });

  it("shares no template id with the frozen TRG.2 product assessment", () => {
    const productTemplateIds = new Set(PRODUCT_ITEM_PACK.map((item) => item.template_id));
    const trg2Product = PRODUCT_ITEM_PACK.filter((item) => item.node_id === "TRG.2");
    expect(trg2Product.length, "the frozen TRG.2 item is here").toBeGreaterThan(0);
    for (const template of ALL_D9_TEMPLATES) {
      expect(productTemplateIds.has(template.template_id), template.template_id).toBe(
        false,
      );
    }
  });
});

describe("D9 pool content pin (a template edit that changes the pool must be explicit)", () => {
  it("pins the frozen D9 practice pool ids + content hashes", () => {
    const snapshot = D9_PRACTICE_POOL.map((item) => ({
      id: item.item_version_id,
      node: item.node_id,
      difficulty: item.difficulty,
      hash: hashItemDefinition(item),
    }));
    expect(snapshot).toMatchSnapshot();
  });
});
