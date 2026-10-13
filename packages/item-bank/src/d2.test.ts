import { canonicalInteractivePayload } from "@cr/components";
import { describe, expect, it } from "vitest";

import { toProductItemVersions } from "./bank";
import { D1_ITEM_PACK, D1_PRACTICE_ITEMS, D1_WALK_ITEM_PACK } from "./d1";
import { d2_rad3_eval_l1, d2_rad3_negeval_l3, d2_rad3_simplify_l3 } from "./d2/nodes/RAD.3";
import { d2_rad4_magnitude_l1, d2_rad4_realroot_l2 } from "./d2/nodes/RAD.4";
import {
  buildRandomizedD2PracticeSet,
  D2_PRACTICE_ITEMS,
  D2_PRACTICE_MIX,
  D2_PRACTICE_NODES,
  D2_PRACTICE_POOL,
  D2_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D2_PRACTICE_TEMPLATES,
  D2_PRACTICE_VARIANTS,
  EXP1_TEMPLATES,
  RAD1_TEMPLATES,
  RAD2_TEMPLATES,
  RAD3_TEMPLATES,
  RAD4_TEMPLATES,
} from "./index";
import { INTERACTIVE_PRACTICE_ITEMS } from "./interactive/practice";
import { PRODUCT_ITEM_PACK } from "./product";
import { hashItemDefinition } from "./schema";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "./template";
import {
  PRODUCT_CHECKER_CONFIG,
  validatePracticePool,
  validateTemplates,
} from "./validate";

/**
 * The D2 ("Boomtown Square") practice pool, all five nodes. It pins the five-slot pool
 * per node and proves the pool self-validates through the v2 PRODUCT checker (which
 * grades BOTH the text shapes and the `expr_builder` widget shapes by dispatching an
 * interactive item to its module), composes the locked five-slot mix, reshuffles without
 * repeating a problem SHAPE, and is fully isolated from every other pool, including the
 * already-frozen product ASSESSMENT items, which this slice never touches.
 *
 * Coverage used to be EXP.1-shaped: `validateTemplates` swept EXP.1 only, so the sixteen
 * RAD templates got no parameter sweep at all; `validatePracticePool` covered the frozen
 * pool but not the retry variants a learner reaches by revealing; and the randomized set
 * was exercised for EXP.1 only. All three now cover the whole domain.
 */

/** Every D2 template, so a sweep cannot silently skip a node. */
const ALL_D2_TEMPLATES: readonly ItemTemplate[] = D2_PRACTICE_TEMPLATES;

describe("D2 practice templates (Boomtown Square)", () => {
  it("authors every node's templates under its real node id with d2 ids", () => {
    const byNode: readonly (readonly [string, readonly ItemTemplate[], string])[] = [
      ["EXP.1", EXP1_TEMPLATES, "d2.exp."],
      ["RAD.1", RAD1_TEMPLATES, "d2.rad1."],
      ["RAD.2", RAD2_TEMPLATES, "d2.rad2."],
      ["RAD.3", RAD3_TEMPLATES, "d2.rad3."],
      ["RAD.4", RAD4_TEMPLATES, "d2.rad4."],
    ];
    for (const [nodeId, templates, prefix] of byNode) {
      expect(templates.length, nodeId).toBeGreaterThanOrEqual(5);
      for (const template of templates) {
        expect(template.node_id, template.template_id).toBe(nodeId);
        expect(template.template_id.startsWith(prefix), template.template_id).toBe(true);
      }
    }
    expect(ALL_D2_TEMPLATES).toHaveLength(
      EXP1_TEMPLATES.length +
        RAD1_TEMPLATES.length +
        RAD2_TEMPLATES.length +
        RAD3_TEMPLATES.length +
        RAD4_TEMPLATES.length,
    );
  });

  it("every sampled instance of EVERY template self-validates through the v2 product checker", () => {
    expect(validateTemplates(ALL_D2_TEMPLATES, 40, PRODUCT_CHECKER_CONFIG)).toEqual([]);
  });

  it("the frozen practice pool composes the five-slot mix and self-validates", () => {
    expect(
      validatePracticePool(
        D2_PRACTICE_POOL,
        { nodes: D2_PRACTICE_NODES, mix: D2_PRACTICE_MIX },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  });

  /**
   * The reveal-to-retry variants are the instances a learner reaches by revealing a slot,
   * and there are roughly six times as many of them as there are pool items. They were
   * never validated, so a template whose parameter range broke only on a variant seed
   * would have shipped. Composition is skipped (variants are not a five-slot mix); every
   * other pool invariant applies.
   */
  it("every retry variant is a distinct, gradable practice item too", () => {
    expect(D2_PRACTICE_VARIANTS.length).toBeGreaterThan(D2_PRACTICE_POOL.length);
    expect(
      validatePracticePool(
        D2_PRACTICE_VARIANTS,
        { nodes: [], mix: [] },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  });

  it("includes the expr_builder widget-graded shapes across the D2 nodes", () => {
    const widgetItems = D2_PRACTICE_POOL.filter(
      (item) => item.answer.answer_spec.answer_type === "expr_builder",
    );
    // One build shape each for EXP.1 / RAD.1 / RAD.2, plus RAD.3's two form
    // conversions and its combine-powers simplify (all form-by-construction).
    expect(widgetItems).toHaveLength(6);
    for (const item of widgetItems) {
      expect(item.answer.interactive_spec).toBeDefined();
    }
  });
});

/**
 * The variety guard. Every D2 template declares a `varietyKey` over its simplified
 * answer, and the pool used to IGNORE it: `buildPool` / `buildVariants` deduped on the
 * content hash alone, so `d2.rad2.build.l3` drawing 2 + 5 and then 3 + 4 was two hashes
 * and one answer. The node headers claimed the key prevented near-twins; now it does.
 */
describe("D2 variety guard (a cell never holds two instances with the same answer)", () => {
  const templateById = new Map(ALL_D2_TEMPLATES.map((t) => [t.template_id, t]));

  function varietyOf(item: FrozenItem): string | undefined {
    return templateById.get(item.template_id)?.varietyKey?.(item.template_params);
  }

  it("declares a varietyKey on every template", () => {
    for (const template of ALL_D2_TEMPLATES) {
      expect(typeof template.varietyKey, template.template_id).toBe("function");
    }
  });

  it("gives every item in a (node, difficulty) cell a distinct variety key", () => {
    const byCell = new Map<string, string[]>();
    for (const item of D2_PRACTICE_POOL) {
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
    for (const item of D2_PRACTICE_VARIANTS) {
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
   * The guard can only be satisfied by a template whose parameter space is big enough:
   * a shorter case list makes `buildVariants` give up after 200 misses and under-deliver
   * without saying so, which is how a cell quietly loses its retry depth.
   */
  it("delivers the full retry depth for every template (no silent shortfall)", () => {
    for (const template of ALL_D2_TEMPLATES) {
      const made = D2_PRACTICE_VARIANTS.filter(
        (item) => item.template_id === template.template_id,
      ).length;
      expect(made, template.template_id).toBe(D2_PRACTICE_RETRY_VARIANTS_PER_CELL);
    }
  });
});

describe("D2 practice set (reshuffle without repeating a shape)", () => {
  const seededRng = () => {
    let seed = 1;
    return () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };
  };

  it("draws a distinct five-slot set in the locked easy-to-hard mix, for every node", () => {
    const rng = seededRng();
    for (const node of D2_PRACTICE_NODES) {
      for (let run = 0; run < 8; run += 1) {
        const set = buildRandomizedD2PracticeSet(node, rng);
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

  /**
   * The repeated-shape defect: slots were drawn uniformly from every instance in a cell,
   * so with two shapes at seven instances each the two L2 slots landed on one shape
   * nearly half the time, and about seven in ten sets repeated a shape somewhere. The
   * draw now spreads across shapes first, so a two-slot cell holding two or more shapes
   * always serves two different ones.
   */
  it("never serves one problem shape twice in a cell that has more than one", () => {
    const rng = seededRng();
    for (const node of D2_PRACTICE_NODES) {
      for (let run = 0; run < 30; run += 1) {
        const set = buildRandomizedD2PracticeSet(node, rng);
        for (const { difficulty } of D2_PRACTICE_MIX) {
          const slots = set.filter((item) => item.difficulty === difficulty);
          const shapesAvailable = new Set(
            D2_PRACTICE_ITEMS.filter(
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
      for (const item of buildRandomizedD2PracticeSet("RAD.1", rng)) {
        seen.add(item.item_version_id);
      }
    }
    expect(seen.size).toBeGreaterThan(5);
  });
});

/**
 * EXP.1's L3 build used to be its own L2 with a branch removed. `d2.exp.net.l2` draws
 * `x^a * x^-b` with |a - b| >= 2 in EITHER direction, so it can land on `1/x^k`;
 * `d2.exp.build.l3` forced the net into [2, 7], so the reciprocal step never happened and
 * only the input modality (widget vs text) separated the two. RAD.1's L3 build carries a
 * note about exactly this defect, so the standard already existed inside the domain.
 */
describe("EXP.1's L3 build is harder than its own L2", () => {
  const build = EXP1_TEMPLATES.find(
    (t) => t.template_id === "d2.exp.build.l3",
  ) as ItemTemplate;
  const net = EXP1_TEMPLATES.find((t) => t.template_id === "d2.exp.net.l2") as ItemTemplate;
  const samples = Array.from({ length: 200 }, (_unused, index) =>
    generateFromTemplate(build, "practice", 880_000 + index),
  );

  it("draws THREE factors, not the L2 shape's two", () => {
    for (const item of samples) {
      expect((item.prompt.match(/\\cdot/g) ?? []).length, item.prompt).toBe(2);
      const { a, b, c, net: total } = item.template_params as Record<string, number>;
      expect(total, item.prompt).toBe((a as number) - (b as number) + (c as number));
    }
  });

  /** The step the two-factor shape cannot ask for: carrying a negative running total. */
  it("always takes the running total below zero before the last factor", () => {
    for (const item of samples) {
      const { a, b } = item.template_params as Record<string, number>;
      expect((a as number) - (b as number), item.prompt).toBeLessThanOrEqual(-2);
    }
  });

  it("keeps every displayed exponent inside the checker's MAX_EXPONENT", () => {
    for (const item of samples) {
      const { a, b, c, net: total } = item.template_params as Record<string, number>;
      for (const exponent of [a, b, c] as number[]) {
        expect(exponent, item.prompt).toBeGreaterThanOrEqual(1);
        expect(exponent, item.prompt).toBeLessThanOrEqual(8);
      }
      // The builder can only hold a positive power, so the net has to stay positive.
      expect(total, item.prompt).toBeGreaterThanOrEqual(2);
    }
  });

  it("leaves the L2 net shape free to reach a reciprocal, which it still does", () => {
    const keys = Array.from({ length: 200 }, (_unused, index) =>
      String(generateFromTemplate(net, "practice", 890_000 + index).answer.answer_key),
    );
    expect(keys.some((key) => key.startsWith("1/"))).toBe(true);
  });
});

/**
 * EXP.1 slide 0 teaches the quotient rule and slide 2 teaches `x^0 = 1`. Both are drilled
 * in a gated widget and NEITHER was graded anywhere: no CFU and none of the five practice
 * shapes divided two powers, and `d2.exp.net.l2` deliberately excludes a net of 0. So a
 * learner could finish the node having been taught two rules nobody ever asked back.
 */
describe("EXP.1 grades the quotient rule and x^0, which it teaches", () => {
  const quotientItems = D2_PRACTICE_ITEMS.filter(
    (item) => item.template_id === "d2.exp.quotient.l2",
  );

  it("ships a quotient shape with a registered instance per retry slot", () => {
    expect(quotientItems).toHaveLength(D2_PRACTICE_RETRY_VARIANTS_PER_CELL);
    for (const item of quotientItems) {
      expect(item.prompt, item.item_version_id).toContain("\\dfrac");
      expect(item.difficulty, item.item_version_id).toBe(2);
    }
  });

  /**
   * The case list is exactly as long as the retry depth and the variety key IS the net,
   * so the six variants are the six nets. A zero is served by construction: if the list
   * ever loses it, this fails rather than quietly going back to never asking.
   */
  it("serves an instance whose answer is x^0, so 1 is a real answer here", () => {
    const zero = quotientItems.filter((item) => item.answer.answer_key === "1");
    expect(zero).toHaveLength(1);
    expect((zero[0] as FrozenItem).template_params.net).toBe(0);
  });

  it("also serves both a positive and a negative net", () => {
    const nets = quotientItems.map((item) => item.template_params.net as number);
    expect(nets.some((value) => value > 0)).toBe(true);
    expect(nets.some((value) => value < 0)).toBe(true);
    expect(new Set(nets).size).toBe(nets.length);
  });

  it("is reachable from a randomized EXP.1 set", () => {
    let seed = 11;
    const rng = () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };
    const served = new Set<string>();
    for (let run = 0; run < 60; run += 1) {
      for (const item of buildRandomizedD2PracticeSet("EXP.1", rng)) {
        served.add(item.template_id);
      }
    }
    expect(served.has("d2.exp.quotient.l2")).toBe(true);
  });

  /** A learner who forgets `x^0 = 1` must still miss, in every way they might miss it. */
  it("does not accept 0 or the bare base for the zero-exponent item", () => {
    const checker = PRODUCT_CHECKER_CONFIG.checker(
      toProductItemVersions([...D2_PRACTICE_ITEMS]),
    );
    const zero = quotientItems.find((item) => item.answer.answer_key === "1") as FrozenItem;
    const grade = (raw: string) =>
      checker({
        raw_answer: raw,
        item_version_id: zero.item_version_id,
        equivalence_checker_version: PRODUCT_CHECKER_CONFIG.checkerVersion,
      });
    expect(grade("1").status).toBe("correct");
    expect(grade("0").status).not.toBe("correct");
    const symbol = zero.answer.allowed_symbols?.[0] as string;
    expect(grade(symbol).status).not.toBe("correct");
  });
});

/**
 * RAD.2's central misconception (sqrt(2) + sqrt(3) is not sqrt(5)) had no practice
 * representation: every combine shape built both terms on the SAME square-free part, so
 * "do these combine?" was never a live question, while the frozen assessment
 * (`prod.golden.rad-2.unlike`) grades exactly that case.
 */
describe("RAD.2 practice asks the unlike-radical question its assessment grades", () => {
  it("ships a shape whose two square-free parts differ", () => {
    const unlike = RAD2_TEMPLATES.find((t) => t.template_id === "d2.rad2.unlike.l2");
    expect(unlike).toBeDefined();
    for (let seed = 0; seed < 40; seed += 1) {
      const item = generateFromTemplate(unlike as ItemTemplate, "practice", 800_000 + seed);
      const { a, b } = item.template_params as { a: number; b: number };
      expect(a, item.item_version_id).not.toBe(b);
      // The key is the two-term simplified sum, never merged into one radical.
      expect(String(item.answer.answer_key)).toMatch(/sqrt\(\d+\)\+\d+\*sqrt\(\d+\)/);
    }
  });

  it("is reachable from a randomized RAD.2 set", () => {
    let seed = 7;
    const rng = () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };
    const served = new Set<string>();
    for (let run = 0; run < 40; run += 1) {
      for (const item of buildRandomizedD2PracticeSet("RAD.2", rng)) {
        served.add(item.template_id);
      }
    }
    expect(served.has("d2.rad2.unlike.l2")).toBe(true);
  });
});

/**
 * The evaluation shapes' `root` and `value` params have to be REAL arithmetic, because
 * every downstream surface (prompt, worked-solution diagram, checker key) is derived
 * from them. This is the numeric half of the guard.
 *
 * The other half - that a learner actually SEES the root named and the power applied -
 * cannot be asserted here. `WorkedSolution` renders the registered SVG INSTEAD of the
 * authored `worked_solution` steps, and both these templates have one, so an assertion
 * over `item.worked_solution` measures a string no learner reads. It lives in
 * `apps/web/src/lessons/workedSolutionArithmetic.test.tsx`, over the rendered DOM.
 */
describe("RAD.3 evaluation shapes carry honest root/value params", () => {
  it.each([
    ["d2.rad3.eval.l1", d2_rad3_eval_l1],
    ["d2.rad3.negeval.l3", d2_rad3_negeval_l3],
  ])("%s: root^den is the base and root^num is the value", (_id, template) => {
    for (let seed = 0; seed < 30; seed += 1) {
      const item = generateFromTemplate(template, "practice", 810_000 + seed);
      const { base, num, den, root, value } = item.template_params as {
        base: number;
        num: number;
        den: number;
        root: number;
        value: number;
      };
      expect(root ** den, item.item_version_id).toBe(base);
      expect(root ** num, item.item_version_id).toBe(value);
    }
  });
});

describe("D2 pool isolation (never touches the frozen EXP.1 assessment or any other pool)", () => {
  it("shares no id or content with any D1 / product / interactive pool", () => {
    const others = [
      ...D1_ITEM_PACK,
      ...D1_PRACTICE_ITEMS,
      ...D1_WALK_ITEM_PACK,
      ...PRODUCT_ITEM_PACK,
      ...INTERACTIVE_PRACTICE_ITEMS,
    ];
    const otherIds = new Set(others.map((item) => item.item_version_id));
    const otherHashes = new Set(others.map(hashItemDefinition));
    for (const item of D2_PRACTICE_ITEMS) {
      expect(otherIds.has(item.item_version_id), item.item_version_id).toBe(false);
      expect(otherHashes.has(hashItemDefinition(item)), item.item_version_id).toBe(false);
    }
  });
});

/**
 * The lowest-terms blocker. `d2.rad3.simplify.l3` is widget-graded by an EXACT
 * num/den match, and several of its sum cases (1/3 + 1/6 = 3/6 and 1/2 + 1/6 = 4/6
 * among them) only reach the key AFTER reducing. The prompt used to say nothing about
 * lowest terms, so a student who summed correctly and entered 3 and 6 was marked wrong
 * with a bare `numerator_mismatch`. The prompt now states the requirement and the
 * comparator reason-codes the form miss so the UI can name the fix.
 */
describe("RAD.3 combine-powers states the lowest-terms requirement it enforces", () => {
  const SAMPLE_SEEDS = Array.from({ length: 60 }, (_unused, index) => 700_000 + index);
  const samples = SAMPLE_SEEDS.map((seed) =>
    generateFromTemplate(d2_rad3_simplify_l3, "A", seed),
  );

  /** The honest intermediate: add over the LCM without reducing. */
  function lcmSum(params: Record<string, number>) {
    const { n1, d1, n2, d2 } = params as {
      n1: number;
      d1: number;
      n2: number;
      d2: number;
    };
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const den = (d1 * d2) / gcd(d1, d2);
    return { num: n1 * (den / d1) + n2 * (den / d2), den };
  }

  it("states 'in lowest terms' in every generated prompt", () => {
    for (const sample of samples) {
      expect(sample.prompt, sample.item_version_id).toContain("in lowest terms");
    }
  });

  it("states it in every SERVED pool instance too", () => {
    const served = D2_PRACTICE_POOL.filter(
      (item) => item.template_id === "d2.rad3.simplify.l3",
    );
    expect(served.length).toBeGreaterThan(0);
    for (const item of served) {
      expect(item.prompt, item.item_version_id).toContain("in lowest terms");
    }
  });

  it("actually serves the cases that only reach the key after reducing", () => {
    // Without at least one of these the prompt fix would be vacuous.
    const needReducing = samples.filter((sample) => {
      const sum = lcmSum(sample.template_params as Record<string, number>);
      return sum.den !== (sample.template_params as { rd: number }).rd;
    });
    expect(needReducing.length).toBeGreaterThan(0);
  });

  it("grades the reduced answer correct, and reason-codes the unreduced one", () => {
    const checker = PRODUCT_CHECKER_CONFIG.checker(toProductItemVersions(samples));
    let unreducedSeen = 0;

    for (const sample of samples) {
      const params = sample.template_params as Record<string, number>;
      const { rn, rd } = params as { rn: number; rd: number };

      // The student who reduces gets credit.
      expect(
        checker({
          raw_answer: { kind: "rational_power", base: "x", num: rn, den: rd },
          item_version_id: sample.item_version_id,
          equivalence_checker_version: PRODUCT_CHECKER_CONFIG.checkerVersion,
        }).status,
        sample.item_version_id,
      ).toBe("correct");

      // The student who sums correctly but stops before reducing is still wrong,
      // but is told WHY: it is a form miss, not a bad numerator.
      const sum = lcmSum(params);
      if (sum.den === rd) {
        continue;
      }
      unreducedSeen += 1;
      expect(
        checker({
          raw_answer: { kind: "rational_power", base: "x", num: sum.num, den: sum.den },
          item_version_id: sample.item_version_id,
          equivalence_checker_version: PRODUCT_CHECKER_CONFIG.checkerVersion,
        }),
        sample.item_version_id,
      ).toMatchObject({ status: "incorrect", reason_code: "exponent_not_reduced" });
    }

    expect(unreducedSeen).toBeGreaterThan(0);
  });

  it("grades a case-variant base correct, so `X` is not marked wrong", () => {
    const checker = PRODUCT_CHECKER_CONFIG.checker(toProductItemVersions(samples));
    for (const sample of samples) {
      const { rn, rd } = sample.template_params as { rn: number; rd: number };
      expect(
        checker({
          raw_answer: { kind: "rational_power", base: "X", num: rn, den: rd },
          item_version_id: sample.item_version_id,
          equivalence_checker_version: PRODUCT_CHECKER_CONFIG.checkerVersion,
        }).status,
        sample.item_version_id,
      ).toBe("correct");
    }
  });
});

/**
 * The case-sensitivity blocker, at the pool level: three of RAD.3's five slots (plus
 * the EXP.1 and RAD.1/RAD.2 build shapes) elicit a free-text base symbol, so a
 * student typing `X` for a key of `x` used to be graded `base_mismatch`.
 *
 * The TEXT sibling was missed by that fix, and it is the one a phone walks into by
 * accident: iOS and Android capitalize the first character of an empty text field, so
 * 56 of the 181 registered D2 instances rejected the upper-cased spelling of their OWN
 * key as `invalid_input / unknown_symbol` -- every EXP.1 shape and every RAD.4 shape
 * with a free letter. The session scores `invalid_input` as unanswered, and the UI
 * says only "check the answer format", which never names case. RAD.1 and RAD.2 are
 * unaffected: their radicands are constants, so their keys carry no free symbol.
 */
describe("D2 items accept an uppercase symbol on the widget AND text paths", () => {
  const allChecker = PRODUCT_CHECKER_CONFIG.checker(
    toProductItemVersions([...D2_PRACTICE_ITEMS]),
  );
  const gradeText = (item: FrozenItem, raw: string) =>
    allChecker({
      raw_answer: raw,
      item_version_id: item.item_version_id,
      equivalence_checker_version: PRODUCT_CHECKER_CONFIG.checkerVersion,
    });

  /** Rewrite each free symbol in `text` as its capital, the way a phone keyboard does. */
  const raiseSymbols = (text: string, symbols: readonly string[]): string =>
    symbols.reduce(
      (out, symbol) =>
        out.replace(
          new RegExp(`(?<![A-Za-z])${symbol}(?![A-Za-z])`, "g"),
          symbol.toUpperCase(),
        ),
      text,
    );

  /**
   * Every registered text instance whose key actually CONTAINS a letter the learner has
   * to type. An item can declare `allowed_symbols` and still have a symbol-free key
   * (`d2.exp.quotient.l2`'s zero-exponent draw answers `1`), and there is no case to get
   * wrong there.
   */
  const symbolBearing = D2_PRACTICE_ITEMS.filter(
    (item) =>
      item.answer.interactive_spec === undefined &&
      typeof item.answer.answer_key === "string" &&
      (item.answer.allowed_symbols ?? []).some((symbol) =>
        new RegExp(`(?<![A-Za-z])${symbol}(?![A-Za-z])`).test(
          String(item.answer.answer_key),
        ),
      ),
  );

  it("grades every served TEXT item correct with its symbols upper-cased", () => {
    // The 56 instances the phone keyboard used to lock out.
    expect(symbolBearing.length).toBeGreaterThanOrEqual(56);
    for (const item of symbolBearing) {
      const key = String(item.answer.answer_key);
      const symbols = item.answer.allowed_symbols as readonly string[];
      const raised = raiseSymbols(key, symbols);
      expect(raised, item.item_version_id).not.toBe(key);
      expect(gradeText(item, key).status, `${item.item_version_id} <- ${key}`).toBe(
        "correct",
      );
      expect(gradeText(item, raised).status, `${item.item_version_id} <- ${raised}`).toBe(
        "correct",
      );
    }
  });

  /**
   * The false-positive guard. Case-folding maps a token ONTO a symbol the item already
   * declares, so it must not turn a wrong letter into a right one. `Y` against a key in
   * `x` has to stay a miss whether or not `y` is a letter this item knows about.
   */
  it("still MISSES a letter the item never declared, in either case", () => {
    let probed = 0;
    for (const item of symbolBearing) {
      const key = String(item.answer.answer_key);
      const symbols = item.answer.allowed_symbols as readonly string[];
      const undeclared = ["q", "z", "k"].find(
        (letter) => !symbols.includes(letter),
      ) as string;
      const first = symbols[0] as string;
      for (const spelling of [undeclared, undeclared.toUpperCase()]) {
        const wrong = key.replace(
          new RegExp(`(?<![A-Za-z])${first}(?![A-Za-z])`, "g"),
          spelling,
        );
        if (wrong === key) {
          continue;
        }
        probed += 1;
        expect(
          gradeText(item, wrong).status,
          `${item.item_version_id} <- ${wrong}`,
        ).not.toBe("correct");
      }
    }
    expect(probed).toBeGreaterThan(0);
  });

  /**
   * The sharper case: BOTH letters are declared, so the fold is live on both, and the
   * answer is still the wrong function. `Y^3/X^4` against a key of `x^3/y^4` must come
   * back a value miss, not a pass.
   */
  it("still MISSES two declared letters swapped, upper-cased", () => {
    let probed = 0;
    for (const item of symbolBearing) {
      const symbols = item.answer.allowed_symbols as readonly string[];
      if (symbols.length < 2) {
        continue;
      }
      const [a, b] = symbols as [string, string];
      const raised = raiseSymbols(String(item.answer.answer_key), symbols);
      const swapped = raised
        .replaceAll(a.toUpperCase(), "\u0000")
        .replaceAll(b.toUpperCase(), a.toUpperCase())
        .replaceAll("\u0000", b.toUpperCase());
      if (swapped === raised) {
        continue;
      }
      probed += 1;
      expect(
        gradeText(item, swapped),
        `${item.item_version_id} <- ${swapped}`,
      ).toMatchObject({ status: "incorrect" });
    }
    expect(probed).toBeGreaterThan(0);
  });

  it("grades every served widget item correct with the base upper-cased", () => {
    const widgetItems = D2_PRACTICE_POOL.filter(
      (item) => item.answer.answer_spec.answer_type === "expr_builder",
    );
    const checker = PRODUCT_CHECKER_CONFIG.checker(toProductItemVersions(D2_PRACTICE_POOL));

    let baseBearing = 0;
    for (const item of widgetItems) {
      const spec = item.answer.interactive_spec as { base?: string } | undefined;
      if (typeof spec?.base !== "string") {
        continue; // coeff_radical has no base slot.
      }
      baseBearing += 1;
      const canonical = canonicalInteractivePayload(
        item.answer.answer_spec.answer_type,
        item.answer.interactive_spec,
      ) as Record<string, unknown>;
      const payload = { ...canonical, base: spec.base.toUpperCase() };
      expect(
        checker({
          raw_answer: payload,
          item_version_id: item.item_version_id,
          equivalence_checker_version: PRODUCT_CHECKER_CONFIG.checkerVersion,
        }).status,
        item.item_version_id,
      ).toBe("correct");
    }
    // EXP.1 build + RAD.3's three base-bearing shapes.
    expect(baseBearing).toBeGreaterThanOrEqual(4);
  });
});

/**
 * RAD.4's whole reason to exist is the distinction between `sqrt(v^2)` and `v`. It is
 * also the one thing a checker can quietly get wrong in the SAFE-looking direction:
 * over the positive half of the line `v`, `abs(v)` and `sqrt(v^2)` are identical to the
 * last bit, so a sampler that never probes a negative would mark the misconception
 * CORRECT and the node would teach nothing. These grade the REAL served pool items
 * through the REAL v2 checker, in both directions.
 */
describe("RAD.4 grades the magnitude distinction it exists to teach", () => {
  const rad4 = D2_PRACTICE_POOL.filter((item) => item.node_id === "RAD.4");
  const checker = PRODUCT_CHECKER_CONFIG.checker(toProductItemVersions(D2_PRACTICE_POOL));
  const grade = (item: FrozenItem, raw: string) =>
    checker({
      raw_answer: raw,
      item_version_id: item.item_version_id,
      equivalence_checker_version: PRODUCT_CHECKER_CONFIG.checkerVersion,
    });

  it("serves the full five-slot RAD.4 set", () => {
    expect(rad4).toHaveLength(5);
  });

  /** Every text shape must reach the variable-aware path, whose gate IS this field. */
  it("declares allowed_symbols on every radical shape, the checker's variable gate", () => {
    const radicals = rad4.filter(
      (item) => item.answer.answer_spec.simplification === "simplified_radical",
    );
    expect(radicals.length).toBeGreaterThan(0);
    for (const item of radicals) {
      expect(item.answer.allowed_symbols?.length, item.item_version_id).toBeGreaterThan(0);
    }
  });

  it("REJECTS the bare letter wherever the key is an absolute value", () => {
    const withBars = rad4.filter((item) => String(item.answer.answer_key).includes("abs("));
    expect(withBars.length).toBeGreaterThan(0);
    for (const item of withBars) {
      const symbol = item.answer.allowed_symbols?.[0] as string;
      const key = String(item.answer.answer_key);
      // The key itself still grades correct...
      expect(grade(item, key).status, item.item_version_id).toBe("correct");
      // ...and so does the pipe spelling of it, which is what a learner types.
      expect(grade(item, key.replace(/abs\(([^)]*)\)/, "|$1|")).status, key).toBe(
        "correct",
      );
      // ...but the same answer with the bars dropped is a VALUE miss, not a form nit.
      const barsDropped = key.replace(/abs\(([^)]*)\)/, "$1");
      expect(grade(item, barsDropped), key).toMatchObject({
        status: "incorrect",
        reason_code: "value_mismatch",
      });
      expect(symbol).toBeTruthy();
    }
  });

  it("REJECTS the unsimplified radical as a form miss, not as correct", () => {
    for (const item of rad4) {
      if (item.answer.answer_spec.simplification !== "simplified_radical") {
        continue;
      }
      const radicand = /\\sqrt\{([^$]*?)\}\$/.exec(item.prompt)?.[1];
      if (!radicand) {
        continue;
      }
      // Re-type the prompt's own radicand back as the answer: value-correct, form-wrong.
      const asTyped = `sqrt(${radicand.replace(/\^\{(\d+)\}/g, "^$1").replace(/([\dA-Za-z}])([A-Za-z])/g, "$1*$2")})`;
      expect(grade(item, asTyped), `${item.item_version_id} <- ${asTyped}`).toMatchObject({
        status: "incorrect",
        reason_code: "not_simplified",
      });
    }
  });

  /**
   * The L1 shape has to draw BOTH parities of the extracted power. If it only ever
   * produced the odd case, "always add bars" would score 100% and the slot would be
   * measuring nothing.
   */
  it("draws both parities at L1, so 'always add bars' cannot pass", () => {
    const keys = Array.from({ length: 60 }, (_unused, index) =>
      String(
        generateFromTemplate(d2_rad4_magnitude_l1, "practice", 960_000 + index).answer
          .answer_key,
      ),
    );
    expect(keys.some((key) => key.includes("abs("))).toBe(true);
    expect(keys.some((key) => !key.includes("abs("))).toBe(true);
  });

  /**
   * The even-root-domain shape logs three roots of negatives and asks for the only real
   * one. Two of them printing the SAME radicand (8^2 and 4^3 are both 64) would read as
   * a trick rather than a parity question.
   */
  it("never logs the same radicand twice in the even-root domain shape", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const item = generateFromTemplate(d2_rad4_realroot_l2, "practice", 970_000 + seed);
      const { cube, square, fourth } = item.template_params as Record<string, number>;
      const shown = [
        (square as number) ** 2,
        (fourth as number) ** 4,
        (cube as number) ** 3,
      ];
      expect(new Set(shown).size, item.prompt).toBe(3);
    }
  });
});

/**
 * The pin is a change DETECTOR, not a prohibition: `hashItemDefinition` covers the prompt
 * text alongside the answer, so any prompt edit moves a hash and the pin's job is to make
 * that edit explicit rather than to forbid it.
 *
 * It has been re-pinned three times, and the acknowledgments live here so the next reader
 * does not have to reconstruct them from a merge commit.
 *
 * PR #92, the plain-language rewrite: 23 of the 25 hashes moved -- exactly the 23 whose
 * prompt wording changed. `d2.rad3.to-exponent.l2` and `d2.rad3.simplify.l3` held,
 * because only their hints and worked solutions moved and neither is hashed. No `id`,
 * `node`, `difficulty`, `template_params`, `answer_key`, `answer_spec`,
 * `interactive_spec` or `allowed_symbols` value changed anywhere in the five node files.
 *
 * The 2026-07-26 D2 QA pass: exactly ONE hash moved, `d2.exp.build.l3:practice:60004`,
 * because that template was reshaped on purpose. Its L3 build was `v^a * v^-b` with the
 * net forced positive, which is the L2 `d2.exp.net.l2` shape with its reciprocal branch
 * removed; it now draws three factors with a negative running total. So its prompt,
 * `template_params` and `interactive_spec.exp` all changed, by intent. Nothing else in
 * the pool moved: the new `d2.exp.quotient.l2` shape is APPENDED to `EXP1_TEMPLATES`, so
 * `buildPool`'s round-robin still takes L2a and L2b for the two frozen L2 slots and the
 * seed walk is unchanged for every later item and node.
 *
 * The 2026-07-26 noun-diversity pass: exactly FIVE more hashes moved, all of them prompt
 * text and nothing else. "Beam" had grown into the only concrete object across three
 * packs, so RAD.1's single-length shapes take a board (`simplify.l2`, `coeff.l3`), its
 * area-to-side shape takes the island brief's own "staked lot" in place of a square patch
 * of ground (`eval.l1`), and RAD.2's two-length COMBINE shapes take a fence rail
 * (`combine-like.l1`, `simplify-combine.l2`). SIX templates were reworded but only five
 * are pinned: the sixth, `d2.rad2.unlike.l2`, is third in the L2 cell and `buildPool`
 * takes the first two shapes per cell, so it is served from the retry variants and reaches
 * no canonical slot. `d2.exp.build.l3:practice:60004` above is the PREVIOUS pass's re-pin
 * and did not move again. Diffing the full item records either side of the edit, `prompt`
 * is the only field that differs anywhere in the pool: no `id`, `node_id`, `difficulty`,
 * `template_params`, `answer_key`, `answer_spec`, `interactive_spec` or `allowed_symbols`
 * value changed, and the set of moved hashes is exactly the set of moved prompts. Every
 * reworded generator was then swept with its expected answer re-derived FROM THE PROMPT
 * TEXT rather than from `template_params`, which is where a prompt/answer mismatch would
 * otherwise hide.
 *
 * No production response can have been graded against the old prompts either: D2 was
 * unreachable in the app until #64 landed on 2026-07-25. The genuinely frozen pack is the
 * product ASSESSMENT pin in `product.test.ts.snap`, which has never moved and holds no
 * RAD item at all.
 */
describe("D2 pool content pin (a template edit that changes the pool must be explicit)", () => {
  it("pins the frozen D2 practice pool ids + content hashes", () => {
    const snapshot = D2_PRACTICE_POOL.map((item) => ({
      id: item.item_version_id,
      node: item.node_id,
      difficulty: item.difficulty,
      hash: hashItemDefinition(item),
    }));
    expect(snapshot).toMatchSnapshot();
  });
});
