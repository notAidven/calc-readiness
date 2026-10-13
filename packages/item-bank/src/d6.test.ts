// The repo ships no `@types/node` on purpose — node built-ins live in `.mjs` scripts rather
// than in tsc-built TS — so a source-reading test has to say so at the import. `packages/
// economy` makes the same read and takes the other route open to it, excluding its two
// fs-reading tests from tsc in its own `tsconfig.json`; item-bank's has no such exclusion and
// this file is not the place to add one. The call itself runs under vitest's node runtime.
// @ts-expect-error - no @types/node in this tree
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { toProductItemVersions } from "./bank";
import { D1_ITEM_PACK, D1_PRACTICE_ITEMS, D1_WALK_ITEM_PACK } from "./d1";
import { D2_PRACTICE_ITEMS } from "./d2";
import { D3_PRACTICE_ITEMS } from "./d3";
import { D5_PRACTICE_ITEMS } from "./d5";
import {
  ADVERTISED_INTERVAL_FORMS,
  INTERVAL_PLACEHOLDER_TEXT,
  rayKey,
  unadvertisedBound,
} from "./d6/nodes/FUN.2";
import { D7_PRACTICE_ITEMS } from "./d7";
import { D8_PRACTICE_ITEMS } from "./d8";
import {
  buildRandomizedD6PracticeSet,
  CG1_TEMPLATES,
  D6_AUTHORED_PRACTICE_NODES,
  D6_PRACTICE_ITEMS,
  D6_PRACTICE_MIX,
  D6_PRACTICE_NODES,
  D6_PRACTICE_POOL,
  D6_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D6_PRACTICE_TEMPLATES,
  D6_PRACTICE_VARIANTS,
  FUN1_TEMPLATES,
  FUN2_TEMPLATES,
  FUN3_TEMPLATES,
  FUN4_CHART_FRAME_COUNT,
  FUN4_CHART_FRAME_OPENINGS,
  FUN4_TEMPLATES,
  FUN5_TEMPLATES,
  FUN6_TEMPLATES,
  FUN7_TEMPLATES,
  FUN8_TEMPLATES,
  FUN9_TEMPLATES,
  FUN10_TEMPLATES,
} from "./index";
import { INTERACTIVE_PRACTICE_ITEMS } from "./interactive/practice";
import { PRODUCT_ITEM_PACK } from "./product";
import { hashItemDefinition } from "./schema";
import {
  type FrozenItem,
  createRng,
  generateFromTemplate,
  type ItemTemplate,
} from "./template";
import {
  PRODUCT_CHECKER_CONFIG,
  validatePracticePool,
  validateTemplates,
} from "./validate";

/**
 * The D6 ("The Gearwright's Menagerie", the automata-workshop island) practice pool, all
 * eleven authored nodes. It pins the five-slot pool per node and proves the pool
 * self-validates through the v2 PRODUCT checker, composes the locked five-slot mix,
 * reshuffles without repeating a problem SHAPE, and is fully isolated from every other pool,
 * including the already-frozen CG.1 and FUN.1 product ASSESSMENT items and the FUN.4 / FUN.9
 * DIAGNOSTIC slices, none of which this slice touches.
 *
 * ## Why PRODUCT_CHECKER_CONFIG and not the default
 *
 * `validateTemplates`'s default is `D1_CHECKER_CONFIG`, which refuses any answer whose
 * `required_notation` is not `"none"`. Three D6 nodes answer in INTERVAL notation — FUN.2
 * (domain and range), FUN.4 (where a run rises and falls) and FUN.10 (the range of a vee) —
 * and `intervalAnswer` sets `required_notation: "interval"`, so the default config rejects
 * every one of those keys before grading them. `d3.test.ts` reached the same wall for LIN.4
 * and LIN.6 and passes the v2 product config; this file does the same, so the sweep grades
 * the keys rather than refusing them.
 *
 * ## The two invariants asserted here rather than left to the checker
 *
 *  - **Every node is authored.** D6's `practice.ts` deliberately SKIPS a node with no
 *    templates instead of throwing, so eleven scaffolded slots could ship with three filled
 *    and nothing in this package would say so. The authored list is asserted equal to the
 *    declared one, which turns that tolerance back into a guard now the domain is finished.
 *  - **Each node serves only the answer types its questions can take.** D6 spans six graders
 *    (numeric, point, interval, solution_set, expression, multiple_choice), which is more
 *    than any other domain in the bank, so a shape that drifted onto the wrong one would
 *    still self-validate. The per-node table below is what fails instead.
 */

/** The answer types each node is allowed to serve, node by node. */
const NODE_ANSWER_TYPES: Readonly<Record<string, readonly string[]>> = {
  "CG.1": ["point", "numeric"],
  "FUN.1": ["numeric"],
  "FUN.2": ["interval"],
  "FUN.3": ["numeric"],
  "FUN.4": ["multiple_choice", "interval", "numeric"],
  "FUN.5": ["numeric"],
  "FUN.6": ["numeric", "expression"],
  "FUN.7": ["numeric", "expression"],
  "FUN.8": ["numeric", "expression"],
  "FUN.9": ["point", "numeric", "multiple_choice"],
  "FUN.10": ["numeric", "point", "solution_set", "interval"],
};

/** Every D6 template, so a sweep cannot silently skip a node. */
const ALL_D6_TEMPLATES: readonly ItemTemplate[] = D6_PRACTICE_TEMPLATES;

/** The per-node template lists, paired with the node id and the id prefix each owes. */
const BY_NODE: readonly (readonly [string, readonly ItemTemplate[], string])[] = [
  ["CG.1", CG1_TEMPLATES, "d6.cg1."],
  ["FUN.1", FUN1_TEMPLATES, "d6.fun1."],
  ["FUN.2", FUN2_TEMPLATES, "d6.fun2."],
  ["FUN.3", FUN3_TEMPLATES, "d6.fun3."],
  ["FUN.4", FUN4_TEMPLATES, "d6.fun4."],
  ["FUN.5", FUN5_TEMPLATES, "d6.fun5."],
  ["FUN.6", FUN6_TEMPLATES, "d6.fun6."],
  ["FUN.7", FUN7_TEMPLATES, "d6.fun7."],
  ["FUN.8", FUN8_TEMPLATES, "d6.fun8."],
  ["FUN.9", FUN9_TEMPLATES, "d6.fun9."],
  ["FUN.10", FUN10_TEMPLATES, "d6.fun10."],
];

describe("D6 practice templates (The Gearwright's Menagerie)", () => {
  it("authors every node's templates under its real node id with d6 ids", () => {
    for (const [nodeId, templates, prefix] of BY_NODE) {
      expect(templates.length, nodeId).toBeGreaterThanOrEqual(5);
      for (const template of templates) {
        expect(template.node_id, template.template_id).toBe(nodeId);
        expect(template.template_id.startsWith(prefix), template.template_id).toBe(true);
      }
    }
    expect(ALL_D6_TEMPLATES).toHaveLength(
      BY_NODE.reduce((total, [, templates]) => total + templates.length, 0),
    );
    // Ids are globally unique inside the domain, so a copy-paste that reused one cannot hide
    // behind the length check above.
    expect(new Set(ALL_D6_TEMPLATES.map((t) => t.template_id)).size).toBe(
      ALL_D6_TEMPLATES.length,
    );
  });

  /**
   * `d6/practice.ts` builds the pool over the nodes that HAVE templates rather than over the
   * eleven declared slots, so eleven authoring agents could work without editing that file.
   * That tolerance is what makes this assertion load-bearing now the domain is finished: the
   * declared list and the authored list are the same list, or a node has quietly gone missing
   * from the pool while every other assertion in this file still passes over what is left.
   */
  it("authors all eleven declared nodes, so no slot is still a scaffold", () => {
    expect([...D6_AUTHORED_PRACTICE_NODES].sort()).toEqual([...D6_PRACTICE_NODES].sort());
    expect(D6_PRACTICE_NODES).toHaveLength(11);
    expect([...D6_PRACTICE_NODES].sort()).toEqual(
      [...new Set(ALL_D6_TEMPLATES.map((t) => t.node_id))].sort(),
    );
  });

  it("composes the locked 1xL1 / 2xL2 / 2xL3 mix from distinct shapes at each level", () => {
    for (const [nodeId, templates] of BY_NODE) {
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

  /**
   * Every practice template declares the lesson concept it tests, which is what lets
   * coverage-aware selection spread a five-slot set across concepts rather than across ids.
   * CG.1, FUN.1 and FUN.9 were authored before that field was expected of a practice
   * template, so they are the declared exception and are named rather than swept under: an
   * unscoped assertion would fail on fifteen shapes and a scoped one that quietly skipped
   * them would stop noticing the other eight nodes.
   */
  const CONCEPT_UNTAGGED: ReadonlySet<string> = new Set(["CG.1", "FUN.1", "FUN.9"]);

  it("tags every template outside the three untagged nodes with its lesson concept", () => {
    const tagged = ALL_D6_TEMPLATES.filter((t) => !CONCEPT_UNTAGGED.has(t.node_id));
    expect(tagged.length, "no template is in the tagged population").toBeGreaterThan(30);
    for (const template of tagged) {
      expect(typeof template.concept, template.template_id).toBe("string");
      expect((template.concept ?? "").length, template.template_id).toBeGreaterThan(3);
    }
    // The other direction, so a node that starts tagging its shapes has to leave the list
    // rather than sitting in it forever excusing nothing.
    for (const nodeId of CONCEPT_UNTAGGED) {
      const inNode = ALL_D6_TEMPLATES.filter((t) => t.node_id === nodeId);
      expect(inNode.length, nodeId).toBe(5);
      expect(
        inNode.filter((t) => t.concept !== undefined).map((t) => t.template_id),
        `${nodeId} has started tagging concepts, so it must leave CONCEPT_UNTAGGED`,
      ).toEqual([]);
    }
  });

  // Interval, point, solution-set and symbolic compares all run through their own
  // comparators and cost far more per item than a plain numeric compare, so these sweeps
  // need more than vitest's 5s default (see d3.test.ts, d5.test.ts and product.test.ts,
  // which budget the same way).
  it("every sampled instance of EVERY template self-validates through the v2 product checker", () => {
    expect(validateTemplates(ALL_D6_TEMPLATES, 40, PRODUCT_CHECKER_CONFIG)).toEqual([]);
  }, 120_000);

  it("the frozen practice pool composes the five-slot mix and self-validates", () => {
    expect(
      validatePracticePool(
        D6_PRACTICE_POOL,
        { nodes: D6_PRACTICE_NODES, mix: D6_PRACTICE_MIX },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  }, 120_000);

  /**
   * The reveal-to-retry variants are the instances a learner reaches by revealing a slot, and
   * there are roughly six times as many of them as there are pool items. Composition is
   * skipped (variants are not a five-slot mix); every other pool invariant applies.
   */
  it("every retry variant is a distinct, gradable practice item too", () => {
    expect(D6_PRACTICE_VARIANTS.length).toBeGreaterThan(D6_PRACTICE_POOL.length);
    expect(
      validatePracticePool(
        D6_PRACTICE_VARIANTS,
        { nodes: [], mix: [] },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  }, 120_000);
});

describe("D6 answers stay in the types their questions call for", () => {
  it("serves each node only its allowed answer types", () => {
    for (const [nodeId, allowed] of Object.entries(NODE_ANSWER_TYPES)) {
      const items = D6_PRACTICE_ITEMS.filter((item) => item.node_id === nodeId);
      expect(items.length, nodeId).toBeGreaterThan(0);
      for (const item of items) {
        expect(allowed, item.item_version_id).toContain(
          item.answer.answer_spec.answer_type,
        );
      }
    }
    // Every node in the table is served, and every served node is in the table, so neither
    // side can drift without failing.
    expect(Object.keys(NODE_ANSWER_TYPES).sort()).toEqual([...D6_PRACTICE_NODES].sort());
  });

  /**
   * The structural comparators grade a FORM as well as a value, so a shape that acquired a
   * representation or precision requirement would be asking for something no prompt states.
   */
  it("leaves every interval, point and solution-set answer representation-free", () => {
    const structural = D6_PRACTICE_ITEMS.filter((item) =>
      ["interval", "point", "solution_set"].includes(item.answer.answer_spec.answer_type),
    );
    expect(structural.length).toBeGreaterThan(20);
    for (const item of structural) {
      expect(item.answer.answer_spec.representation, item.item_version_id).toBe("any");
      expect(item.answer.answer_spec.precision, item.item_version_id).toBeNull();
    }
  });

  /**
   * The reason this file needs the v2 product config at all, pinned so the requirement is a
   * recorded fact rather than something a reader has to infer from a config name. FUN.2,
   * FUN.4 and FUN.10 serve plain interval keys, which `D1_CHECKER_CONFIG` refuses outright
   * on `required_notation` before it grades anything.
   */
  it("serves plain interval keys, which the default D1 config would refuse", () => {
    const intervals = D6_PRACTICE_ITEMS.filter(
      (item) => item.answer.answer_spec.answer_type === "interval",
    );
    expect(
      intervals.length,
      "no interval items at all, so the config choice proves nothing",
    ).toBeGreaterThan(20);
    for (const item of intervals) {
      expect(item.answer.answer_spec.required_notation, item.item_version_id).toBe(
        "interval",
      );
    }
    expect(
      [...new Set(intervals.map((item) => item.node_id))].sort(),
      "the interval cohort is not the three nodes that answer in interval notation",
    ).toEqual(["FUN.10", "FUN.2", "FUN.4"]);
  });

  /**
   * A union key only parses with whitespace around its `U`, and an empty solution set has no
   * interval spelling at all. Both are authoring constraints carried by
   * `INTERVAL_PLACEHOLDER` rather than by any prompt, so this is where they are pinned for
   * the D6 cohort (`d3.test.ts` pins the same two for D3).
   */
  it("writes every interval union with whitespace around the join, and never an empty set", () => {
    const intervals = D6_PRACTICE_ITEMS.filter(
      (item) => item.answer.answer_spec.answer_type === "interval",
    );
    const unions = intervals.filter((item) => (item.answer.answer_key ?? "").includes("U"));
    expect(
      unions.length,
      "no union keys, so the delimiter rule is untested",
    ).toBeGreaterThan(5);
    for (const item of unions) {
      const key = item.answer.answer_key ?? "";
      expect(key, item.item_version_id).toMatch(/[)\]] U [[(]/);
      expect(key, item.item_version_id).not.toMatch(/\boo\b/);
    }
    for (const item of intervals) {
      const key = (item.answer.answer_key ?? "").trim();
      expect(key, item.item_version_id).not.toBe("{}");
      expect(key.length, item.item_version_id).toBeGreaterThan(4);
    }
  });
});

/**
 * R30: an answer field's own example must not answer a problem it is SHOWN ON.
 *
 * Graded rather than string-compared, which is the whole point: a key of `{4, 9}` is not the
 * string `4, 9` and a bare `4` scores correct against a numeric key of `4`, so comparing text
 * would miss the leak entirely. Each cohort mirrors `answerNotation`'s own dispatch rather
 * than sweeping the whole pool, because the rule is about a learner reading the field in
 * front of them: an example is only a leak on an item it is shown on.
 *
 * `apps/web/src/lessons/answerFormat.test.ts` is the authoritative sweep over the served
 * pools; this is the domain-local echo, so a leak fails in the package that authored it.
 *
 * The forms are IMPORTED from `d6/nodes/FUN.2/index.ts`, which is D6's one copy of the
 * placeholder text and derives the three forms from it. This file used to transcribe them a
 * third time, beside the generators' own transcription; the two agreed here and disagreed
 * with the generators, which is how a sweep that reads one of them can be green while the
 * other lets the example through.
 */

describe("no answer field's own example answers a D6 item it is shown on", () => {
  const ADVERTISED: readonly {
    name: string;
    forms: readonly string[];
    shownFor: (item: FrozenItem) => boolean;
    floor: number;
  }[] = [
    {
      name: "INTERVAL_PLACEHOLDER",
      forms: ADVERTISED_INTERVAL_FORMS,
      shownFor: (item) => item.answer.answer_spec.answer_type === "interval",
      floor: 20,
    },
    {
      // POINT_PLACEHOLDER: "A point, e.g. (6, -7)"
      name: "POINT_PLACEHOLDER",
      forms: ["(6, -7)"],
      shownFor: (item) => item.answer.answer_spec.answer_type === "point",
      floor: 20,
    },
    {
      // The roster example FUN.10's two solution-set prompts print for themselves.
      name: "ROSTER_TASK example",
      forms: ["{4, 9}"],
      shownFor: (item) => item.answer.answer_spec.answer_type === "solution_set",
      floor: 10,
    },
  ];

  it.each(ADVERTISED.map((entry) => [entry.name, entry] as const))(
    "%s scores nothing on the D6 items it is shown on",
    (_name, entry) => {
      const shown = D6_PRACTICE_ITEMS.filter(entry.shownFor);
      const checker = PRODUCT_CHECKER_CONFIG.checker(toProductItemVersions([...shown]));
      const leaked: string[] = [];
      for (const item of shown) {
        for (const form of entry.forms) {
          const result = checker({
            raw_answer: form,
            item_version_id: item.item_version_id,
            equivalence_checker_version: PRODUCT_CHECKER_CONFIG.checkerVersion,
          });
          if (result.status === "correct") {
            leaked.push(
              `${form} answers ${item.item_version_id} (${item.answer.answer_key})`,
            );
          }
        }
      }
      // A containment claim over an empty collection proves nothing, so the count is the floor.
      expect(shown.length, `${entry.name} is shown on no D6 item`).toBeGreaterThan(
        entry.floor,
      );
      expect(leaked.join("; ")).toBe("");
    },
    120_000,
  );
});

/**
 * The same rule asked of the TEMPLATES rather than of the frozen pool, which is a different
 * and stronger claim.
 *
 * The sweep above reads the 66 instances the freezer happened to draw. A template whose
 * PARAMETER SPACE contains an advertised form is leak-free in that pool by seed accident:
 * one reroll of the pool, one retry variant a learner reaches, or one more instance per cell
 * and the example answers the item it is printed under. `answerFormat.ts` records exactly
 * that reading for `INTERVAL_PLACEHOLDER` — "measured over all 128 served interval keys at
 * this tip, `(-inf, 5]`, `(7, inf)` and the union of the two answer nothing" — which is a true
 * statement about a tip and not about the generators.
 *
 * So this sweeps 800 seeds per interval template and compares the KEY as a string, because
 * every key here is produced in one canonical spelling and a string match is therefore
 * exact. Three templates fail it, and they are DECLARED below rather than left out.
 */
const INTERVAL_SEEDS = Array.from({ length: 800 }, (_, index) => 900_001 + index * 13);

/**
 * The interval templates whose key space reaches an advertised form. DELIBERATELY EMPTY, and
 * kept rather than deleted, because the pair of assertions under it is what a future entry
 * would be held to.
 *
 * It held three, all real defects with one cause: `INTERVAL_PLACEHOLDER`'s upper bound moved
 * from 2 to 5 when D6 landed, because `d6.fun10.range.l3` was keying `(-inf, 2]` and the ray
 * form scored it. Moving the example moved the collision rather than removing it — FUN.2's
 * guard went on shifting draws off 2, a number nothing advertises, and FUN.10 had no guard at
 * all. All three are fixed at the generator: FUN.2 now derives the forms from the placeholder
 * text instead of transcribing them, and FUN.10 draws its vertex through the same helper. The
 * entries left this list because the assertion below made them: a declared defect that stops
 * reaching an advertised form fails until it is removed.
 */
const INTERVAL_FORM_REACHABLE: Readonly<Record<string, string>> = {};

describe("no interval template's key space reaches an advertised example", () => {
  const intervalTemplates = ALL_D6_TEMPLATES.filter(
    (template) =>
      generateFromTemplate(template, "A", 900_001).answer.answer_spec.answer_type ===
      "interval",
  );

  /** Every advertised form this template's key space reaches, over the fixed seed list. */
  function reachedForms(template: ItemTemplate): string[] {
    const reached = new Set<string>();
    for (const seed of INTERVAL_SEEDS) {
      const key = (
        generateFromTemplate(template, "A", seed).answer.answer_key ?? ""
      ).trim();
      if (ADVERTISED_INTERVAL_FORMS.includes(key)) {
        reached.add(key);
      }
    }
    return [...reached].sort();
  }

  it("sweeps the interval templates, and the population is the three interval nodes", () => {
    expect(
      intervalTemplates.length,
      "no interval template was found, so the sweep below proves nothing",
    ).toBeGreaterThanOrEqual(5);
    expect([...new Set(intervalTemplates.map((t) => t.node_id))].sort()).toEqual([
      "FUN.10",
      "FUN.2",
      "FUN.4",
    ]);
    // Both directions on the declared list: nothing may be excused that is not a template.
    const authored = new Set(ALL_D6_TEMPLATES.map((t) => t.template_id));
    for (const id of Object.keys(INTERVAL_FORM_REACHABLE)) {
      expect(authored.has(id), `${id} is declared but is not a D6 template`).toBe(true);
    }
    // And a floor under the SWEPT population, not just the whole one: a declared list is
    // allowed to grow, and a list that grew until it covered every interval template would
    // leave the sweep below running over nothing while still reporting green.
    expect(
      intervalTemplates.filter((t) => INTERVAL_FORM_REACHABLE[t.template_id] === undefined)
        .length,
      "every interval template is excused, so the sweep below measures nothing",
    ).toBeGreaterThanOrEqual(5);
  });

  it.each(
    intervalTemplates
      .filter((t) => INTERVAL_FORM_REACHABLE[t.template_id] === undefined)
      .map((t) => [t.template_id, t] as const),
  )(
    "%s never keys an advertised interval example",
    (_id, template) => {
      expect(reachedForms(template)).toEqual([]);
    },
    60_000,
  );

  /**
   * The other direction, which is what stops a declared defect becoming permanent by
   * neglect: an entry that has stopped reaching an advertised form has been FIXED, and has to
   * leave this list rather than sit in it excusing nothing.
   *
   * One `it` over a loop rather than `it.each`, because the list is empty now that all three
   * entries have been fixed out of it and an `each` over nothing is a suite that silently
   * stops registering the claim. The claim it makes is unchanged, and it is the assertion that
   * emptied the list: pointing it back at any of the three fixed templates fails here.
   */
  it("every declared defect still reaches an advertised example", () => {
    const fixed: string[] = [];
    for (const id of Object.keys(INTERVAL_FORM_REACHABLE)) {
      const template = ALL_D6_TEMPLATES.find((t) => t.template_id === id);
      expect(template, id).toBeDefined();
      if (reachedForms(template as ItemTemplate).length === 0) {
        fixed.push(
          `${id} no longer keys an advertised example, so it must leave INTERVAL_FORM_REACHABLE`,
        );
      }
    }
    expect(fixed.join("\n")).toBe("");
  }, 60_000);
});

/**
 * The generators' copy of the placeholder is the placeholder.
 *
 * This is the assertion the three fixed defects were missing. `packages/item-bank` cannot
 * import `apps/web`, so `d6/nodes/FUN.2/index.ts` restates the interval field's example text
 * and derives every guarded form from it — but a restatement with nothing holding it to the
 * original is exactly what went stale when the bound moved from 2 to 5. So the placeholder is
 * read off disk here and compared, which makes the next move of that example a red test
 * naming the constant to move rather than three templates keying it.
 */
describe("the interval example D6 guards against is the one apps/web prints", () => {
  it("matches INTERVAL_PLACEHOLDER in answerFormat.ts", () => {
    const source = readFileSync(
      new URL("../../../apps/web/src/lessons/answerFormat.ts", import.meta.url),
      "utf8",
    );
    const declared = /export const INTERVAL_PLACEHOLDER = "([^"]+)"/.exec(source)?.[1];
    expect(
      declared,
      "INTERVAL_PLACEHOLDER was not found in answerFormat.ts, so this test read nothing",
    ).toBeDefined();
    expect(declared).toBe(INTERVAL_PLACEHOLDER_TEXT);
  });

  /**
   * The parse is load-bearing, so it owes its own floor. A floor rather than a transcription:
   * a parse returning nothing would leave every guard above vacuously satisfied, and that is
   * what this catches, while a moved example still does not have to be typed out again here.
   */
  it("derives the union and both rays from that text", () => {
    expect(ADVERTISED_INTERVAL_FORMS).toHaveLength(3);
    for (const form of ADVERTISED_INTERVAL_FORMS) {
      expect(INTERVAL_PLACEHOLDER_TEXT).toContain(form);
    }
    const [union, ...rays] = ADVERTISED_INTERVAL_FORMS;
    expect(rays).toHaveLength(2);
    for (const ray of rays) {
      expect(union).toContain(ray);
    }
  });

  /**
   * The shifter BITES, asserted against the ray rather than against a number.
   *
   * The seed sweeps above say no template reaches an advertised form, and a generator that had
   * simply stopped drawing near the bound would satisfy them just as well as a working guard.
   * This points `unadvertisedBound` straight at each advertised ray and watches the draw move,
   * so "the sweep is clean" and "the thing keeping it clean still works" are two failures
   * rather than one. The round-trip is the floor under it: it fails if the parse below has
   * drifted off the spelling the generators actually produce, which would leave the shift
   * being measured on a string no key ever takes.
   */
  it("shifts a draw off every advertised ray", () => {
    const rays = ADVERTISED_INTERVAL_FORMS.filter((form) => !form.includes(" U "));
    expect(rays, "no ray to point the shifter at").toHaveLength(2);
    for (const ray of rays) {
      const down = /^\(-inf, (-?\d+)(\]|\))$/.exec(ray);
      const up = /^(\[|\()(-?\d+), inf\)$/.exec(ray);
      const parsed = down
        ? { bound: Number(down[1]), closed: down[2] === "]", upward: false }
        : up
          ? { bound: Number(up[2]), closed: up[1] === "[", upward: true }
          : null;
      expect(parsed, `${ray} is not a ray this test can read`).not.toBeNull();
      const { bound, closed, upward } = parsed as {
        bound: number;
        closed: boolean;
        upward: boolean;
      };
      expect(rayKey(bound, closed, upward), "the parse round-trips").toBe(ray);
      const shifted = unadvertisedBound(bound, closed, upward);
      expect(shifted, `${ray}: the draw was left on the advertised bound`).not.toBe(bound);
      expect(
        ADVERTISED_INTERVAL_FORMS,
        `${ray}: the shift landed on another advertised form`,
      ).not.toContain(rayKey(shifted, closed, upward));
    }
  });
});

/**
 * The variety guard. Every D6 template declares a `varietyKey`, and both freezers honour it:
 * content-hash distinctness alone would let two instances that reduce to the same question
 * sit in one cell, which matters here because several shapes reach the same reading from
 * different rules.
 */
describe("D6 variety guard (a cell never holds two instances of the same question)", () => {
  const templateById = new Map(ALL_D6_TEMPLATES.map((t) => [t.template_id, t]));

  function varietyOf(item: FrozenItem): string | undefined {
    return templateById.get(item.template_id)?.varietyKey?.(item.template_params);
  }

  it("declares a varietyKey on every template", () => {
    for (const template of ALL_D6_TEMPLATES) {
      expect(typeof template.varietyKey, template.template_id).toBe("function");
    }
  });

  it("gives every item in a (node, difficulty) cell a distinct variety key", () => {
    const byCell = new Map<string, string[]>();
    for (const item of D6_PRACTICE_POOL) {
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
    for (const item of D6_PRACTICE_VARIANTS) {
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
    for (const template of ALL_D6_TEMPLATES) {
      const made = D6_PRACTICE_VARIANTS.filter(
        (item) => item.template_id === template.template_id,
      ).length;
      expect(made, template.template_id).toBe(D6_PRACTICE_RETRY_VARIANTS_PER_CELL);
    }
  });
});

describe("D6 practice set (reshuffle without repeating a shape)", () => {
  const seededRng = () => {
    let seed = 1;
    return () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };
  };

  it("draws a distinct five-slot set in the locked easy-to-hard mix, for every node", () => {
    const rng = seededRng();
    for (const node of D6_PRACTICE_NODES) {
      for (let run = 0; run < 8; run += 1) {
        const set = buildRandomizedD6PracticeSet(node, rng);
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
    for (const node of D6_PRACTICE_NODES) {
      for (let run = 0; run < 30; run += 1) {
        const set = buildRandomizedD6PracticeSet(node, rng);
        for (const { difficulty } of D6_PRACTICE_MIX) {
          const slots = set.filter((item) => item.difficulty === difficulty);
          const shapesAvailable = new Set(
            D6_PRACTICE_ITEMS.filter(
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
      for (const item of buildRandomizedD6PracticeSet("CG.1", rng)) {
        seen.add(item.item_version_id);
      }
    }
    expect(seen.size).toBeGreaterThan(5);
  });
});

describe("D6 pool isolation (never touches the frozen CG.1 / FUN.1 assessments or any other pool)", () => {
  it("shares no id or content with any other authored pool", () => {
    const others = [
      ...D1_ITEM_PACK,
      ...D1_PRACTICE_ITEMS,
      ...D1_WALK_ITEM_PACK,
      ...D2_PRACTICE_ITEMS,
      ...D3_PRACTICE_ITEMS,
      ...D5_PRACTICE_ITEMS,
      ...D7_PRACTICE_ITEMS,
      ...D8_PRACTICE_ITEMS,
      ...PRODUCT_ITEM_PACK,
      ...INTERACTIVE_PRACTICE_ITEMS,
    ];
    const otherIds = new Set(others.map((item) => item.item_version_id));
    const otherHashes = new Set(others.map(hashItemDefinition));
    for (const item of D6_PRACTICE_ITEMS) {
      expect(otherIds.has(item.item_version_id), item.item_version_id).toBe(false);
      expect(otherHashes.has(hashItemDefinition(item)), item.item_version_id).toBe(false);
    }
  });

  it("shares no template id with the frozen CG.1 and FUN.1 product assessments", () => {
    const productTemplateIds = new Set(PRODUCT_ITEM_PACK.map((item) => item.template_id));
    // The two frozen shapes this pool is kept clear of are really here, so the sweep below
    // is not a claim about an empty set.
    expect(
      productTemplateIds.has("prod.cg-1.l2"),
      "the frozen CG.1 midpoint item is here",
    ).toBe(true);
    expect(
      productTemplateIds.has("prod.fun-1.l2"),
      "the frozen FUN.1 evaluate item is here",
    ).toBe(true);
    for (const template of ALL_D6_TEMPLATES) {
      expect(productTemplateIds.has(template.template_id), template.template_id).toBe(
        false,
      );
    }
  });
});

describe("FUN.4 practice prompt framing", () => {
  /** Which authored openings appear across practice-form draws of every FUN.4 template. */
  function openingsSeen(seedsPerTemplate: number): Set<string> {
    const seen = new Set<string>();
    for (const template of FUN4_TEMPLATES) {
      for (let seed = 1; seed <= seedsPerTemplate; seed += 1) {
        const { prompt } = template.generate(createRng(seed * 7919 + 13), {
          form: "practice",
        });
        for (const opening of FUN4_CHART_FRAME_OPENINGS) {
          if (prompt.startsWith(opening)) {
            seen.add(opening);
          }
        }
      }
    }
    return seen;
  }

  it("declares more than one practice framing", () => {
    expect(FUN4_CHART_FRAME_COUNT).toBeGreaterThan(1);
    expect(FUN4_CHART_FRAME_OPENINGS.length).toBe(FUN4_CHART_FRAME_COUNT);
  });

  it("serves at least two distinct practice openings across FUN.4 templates", () => {
    const seen = openingsSeen(40);
    expect(seen.size, [...seen].join(" | ")).toBeGreaterThanOrEqual(2);
    expect(seen.size, [...seen].join(" | ")).toBe(FUN4_CHART_FRAME_OPENINGS.length);
  });

  it("fails the census if the population collapses to one opening", () => {
    const seen = openingsSeen(40);
    const censusPasses = (population: readonly string[]) =>
      population.length >= 2 && seen.size >= 2;
    expect(censusPasses(FUN4_CHART_FRAME_OPENINGS)).toBe(true);
    expect(censusPasses([FUN4_CHART_FRAME_OPENINGS[0] as string])).toBe(false);
  });
});

describe("D6 pool content pin (a template edit that changes the pool must be explicit)", () => {
  it("pins the frozen D6 practice pool ids + content hashes", () => {
    const snapshot = D6_PRACTICE_POOL.map((item) => ({
      id: item.item_version_id,
      node: item.node_id,
      difficulty: item.difficulty,
      hash: hashItemDefinition(item),
    }));
    expect(snapshot).toMatchSnapshot();
  });
});
