import { ERA_SEQUENCE, getProductNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { toProductItemVersions } from "./bank";
import { D1_ITEM_PACK, D1_PRACTICE_ITEMS, D1_WALK_ITEM_PACK } from "./d1";
import { D2_PRACTICE_ITEMS } from "./d2";
import { D3_PRACTICE_ITEMS } from "./d3";
import { signedTerm, termSum } from "./d4/nodes/_shared";
import { DERIVABLE_TEMPLATE_IDS, deriveFromPrompt } from "./d4/promptDerive";
import { D5_PRACTICE_ITEMS } from "./d5";
import { D7_PRACTICE_ITEMS } from "./d7";
import { D8_PRACTICE_ITEMS } from "./d8";
import {
  buildRandomizedD4PracticeSet,
  D4_PRACTICE_ITEMS,
  D4_PRACTICE_MIX,
  D4_PRACTICE_NODES,
  D4_PRACTICE_POOL,
  D4_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D4_PRACTICE_TEMPLATES,
  D4_PRACTICE_VARIANTS,
  POL1_TEMPLATES,
  POL2_TEMPLATES,
  POL3_TEMPLATES,
  POL4_TEMPLATES,
  POL5_TEMPLATES,
  POL6_TEMPLATES,
  POL7_TEMPLATES,
  POL8_TEMPLATES,
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
 * One throwaway draw, for the sweeps below that walk a generator's parameter space rather than
 * reading the frozen pool.
 *
 * The form is `"practice"` and not a label naming the sweep. `ItemForm` is `"A" | "B" |
 * "practice"` — the assessment forms and the practice pool — and every D4 template serves the
 * practice pool only, so any other value is a fiction the type system is right to refuse. The
 * sweeps here originally passed `"sweep"`, `"zero-sweep"` and the like, which reads well in a
 * call and left `npm run typecheck` reporting five errors while every one of those sweeps ran
 * green under vitest, because vitest transpiles without checking types.
 */
function drawOne(template: ItemTemplate, seed: number): FrozenItem {
  return generateFromTemplate(template, "practice", seed);
}

/**
 * The D4 (Polynomials & Quadratics) practice pool, which is now the WHOLE domain across three
 * eras. It pins the five-slot pool per node and proves the pool self-validates through the v2
 * PRODUCT checker, composes the locked five-slot mix, reshuffles without repeating a problem
 * SHAPE, and is fully isolated from every other pool, including the already-frozen POL.1 and
 * POL.2 product ASSESSMENT items, which this slice does not touch.
 *
 * Four D4-specific invariants are asserted here rather than left to a reader's care:
 *
 *  - **The pool is the whole DOMAIN and the domain spans three eras.** POL.1 to POL.4 and POL.8
 *    are Classical, POL.6 and POL.7 are Early Modern, POL.5 is Industrial (`ERA_SEQUENCE`). The
 *    spread is asserted so a directory named after a domain is not read as an era, which is what
 *    the exception list used to be for while three of the eight were unauthored.
 *  - **No key spells a product with a star.** A monomial common factor can only be keyed
 *    `3*x*(x - 4)`, and the natural `3x(x - 4)` a learner types is refused `invalid_input`.
 *    The pool avoids that shape entirely, so every key here is typable as it is written.
 *  - **No key is a roster the answer field advertises.** `SOLUTION_SET_PLACEHOLDER` prints
 *    "13 or {-1, 4}" as its example, and R30's leak check grades both against every served
 *    solution set; a key of either would be answered by the field itself.
 *  - **Every difficulty cell holds two distinct SHAPES at L2 and L3**, so a reshuffled set
 *    never repeats a question.
 */

/** The answer types each node is allowed to serve. */
const NODE_ANSWER_TYPES: Readonly<Record<string, readonly string[]>> = {
  "POL.1": ["expression", "numeric"],
  "POL.2": ["expression"],
  "POL.3": ["solution_set"],
  "POL.4": ["numeric", "solution_set"],
  // A vertex coordinate, an extreme value and a `y`-intercept are single readings on an axis;
  // a pair of `x`-intercepts is a roster. Nothing here keys an expression, because a vertex-form
  // key is refused `invalid_input / unsupported_syntax` by the real checker.
  "POL.5": ["numeric", "solution_set"],
  "POL.6": ["numeric", "expression", "multiple_choice"],
  "POL.7": ["numeric", "solution_set", "expression"],
  "POL.8": ["numeric", "expression"],
};

/** Every D4 template, so a sweep cannot silently skip a node. */
const ALL_D4_TEMPLATES: readonly ItemTemplate[] = D4_PRACTICE_TEMPLATES;

/** Every live node of the Polynomials domain, derived from the registry rather than listed. */
const DOMAIN_NODES: readonly string[] = getProductNodes()
  .filter((node) => node.domain === "D4")
  .map((node) => node.id);

describe("D4 practice templates (Polynomials & Quadratics, three eras)", () => {
  it("authors every node's templates under its real node id with d4 ids", () => {
    const byNode: readonly (readonly [string, readonly ItemTemplate[], string])[] = [
      ["POL.1", POL1_TEMPLATES, "d4.pol1."],
      ["POL.2", POL2_TEMPLATES, "d4.pol2."],
      ["POL.3", POL3_TEMPLATES, "d4.pol3."],
      ["POL.4", POL4_TEMPLATES, "d4.pol4."],
      ["POL.8", POL8_TEMPLATES, "d4.pol8."],
      ["POL.6", POL6_TEMPLATES, "d4.pol6."],
      ["POL.7", POL7_TEMPLATES, "d4.pol7."],
      ["POL.5", POL5_TEMPLATES, "d4.pol5."],
    ];
    for (const [nodeId, templates, prefix] of byNode) {
      expect(templates.length, nodeId).toBeGreaterThanOrEqual(5);
      for (const template of templates) {
        expect(template.node_id, template.template_id).toBe(nodeId);
        expect(template.template_id.startsWith(prefix), template.template_id).toBe(true);
      }
    }
    expect(ALL_D4_TEMPLATES).toHaveLength(
      POL1_TEMPLATES.length +
        POL2_TEMPLATES.length +
        POL3_TEMPLATES.length +
        POL4_TEMPLATES.length +
        POL8_TEMPLATES.length +
        POL6_TEMPLATES.length +
        POL7_TEMPLATES.length +
        POL5_TEMPLATES.length,
    );
  });

  /**
   * THE WHOLE DOMAIN, and the exception list is gone rather than emptied.
   *
   * This used to read "every Polynomials node but the one it names", over an
   * `UNSERVED_POLYNOMIAL_NODES` record that held `POL.5` and, before it was authored, `POL.6`
   * and `POL.7`. With `POL.5` authored the record would hold nothing, and an exception list
   * over an empty set is the shape `.cursor/rules/qa-verification.mdc` warns about: its
   * both-directions loop runs over nothing, and its "the list has not swallowed the domain"
   * floor is satisfied by zero. Deleting it and asserting the SET EQUALITY outright is
   * strictly stronger, and the injection that shows it is the one the old form excused:
   * drop `POL.5` from `D4_PRACTICE_NODES` and this fails naming it, where the old assertion
   * subtracted it from the expectation and passed.
   *
   * The era spread is asserted beside it, because "the pool is the whole domain" and "the
   * domain is not one era" are two claims and only the first survives on its own. A directory
   * named after a domain holding three eras' worth of nodes is what the exception list used to
   * be explaining.
   */
  it("serves every Polynomials node, and they are not one era", () => {
    expect(DOMAIN_NODES.length, "the registry returned no D4 nodes").toBeGreaterThanOrEqual(
      8,
    );
    expect([...D4_PRACTICE_NODES].sort()).toEqual([...DOMAIN_NODES].sort());
    // The registered nodes are exactly the ones with templates, so no node in the pool can be
    // missing a shape and no shape can belong to an unregistered node.
    expect([...D4_PRACTICE_NODES].sort()).toEqual(
      [...new Set(ALL_D4_TEMPLATES.map((t) => t.node_id))].sort(),
    );
    // Read off `ERA_SEQUENCE` rather than written down, so a node re-homed to another era moves
    // this reading with it. Three is the claim: the count alone would be met by any spread, so
    // the eras are named, and each is checked to actually hold one of these nodes.
    const eraOf = new Map<string, string>();
    for (const era of ERA_SEQUENCE) {
      for (const nodeId of era.nodes) {
        eraOf.set(nodeId, era.id);
      }
    }
    const eras = new Set(DOMAIN_NODES.map((nodeId) => eraOf.get(nodeId)));
    // `renaissance` is the sixth era's registry id; the docs call the same era Early Modern.
    expect([...eras].sort()).toEqual(["classical", "industrial", "renaissance"]);
    expect(eraOf.get("POL.5"), "POL.5 left the Industrial era").toBe("industrial");
  });

  it("composes the locked 1xL1 / 2xL2 / 2xL3 mix from distinct shapes at each level", () => {
    for (const [nodeId, templates] of [
      ["POL.1", POL1_TEMPLATES],
      ["POL.2", POL2_TEMPLATES],
      ["POL.3", POL3_TEMPLATES],
      ["POL.4", POL4_TEMPLATES],
      ["POL.8", POL8_TEMPLATES],
      ["POL.6", POL6_TEMPLATES],
      ["POL.7", POL7_TEMPLATES],
    ] as const) {
      for (const [difficulty, expected] of [
        [1, 1],
        [2, 2],
        [3, 2],
      ] as const) {
        const atLevel = templates.filter((t) => t.difficulty === difficulty);
        expect(atLevel.length, `${nodeId} L${difficulty}`).toBe(expected);
        expect(
          new Set(atLevel.map((t) => t.template_id)).size,
          `${nodeId} L${difficulty}`,
        ).toBe(expected);
      }
    }
  });

  // Structural and solution-set compares run through the v2 comparators and cost far more per
  // item than a plain numeric compare, so these sweeps need more than vitest's 5s default (see
  // d3.test.ts, d5.test.ts, d7.test.ts and d8.test.ts, which budget the same way).
  it("every sampled instance of EVERY template self-validates through the v2 product checker", () => {
    expect(validateTemplates(ALL_D4_TEMPLATES, 40, PRODUCT_CHECKER_CONFIG)).toEqual([]);
  }, 120_000);

  it("declares a concept and a variety key on every template", () => {
    for (const template of ALL_D4_TEMPLATES) {
      expect(template.concept, template.template_id).toBeTruthy();
      expect(template.varietyKey, template.template_id).toBeDefined();
    }
  });
});

describe("the D4 practice pool", () => {
  it("freezes five slots per node in the locked mix, easy to hard", () => {
    for (const node of D4_PRACTICE_NODES) {
      const slots = D4_PRACTICE_POOL.filter((item) => item.node_id === node);
      expect(slots.length, node).toBe(5);
      expect(slots.map((item) => item.difficulty)).toEqual([1, 2, 2, 3, 3]);
      // Two distinct shapes at each of L2 and L3, or a reshuffle repeats a question.
      for (const difficulty of [2, 3] as const) {
        const shapes = new Set(
          slots.filter((item) => item.difficulty === difficulty).map((i) => i.template_id),
        );
        expect(shapes.size, `${node} L${difficulty}`).toBe(2);
      }
    }
    expect(D4_PRACTICE_POOL.length).toBe(
      D4_PRACTICE_NODES.length *
        D4_PRACTICE_MIX.reduce((total, cell) => total + cell.count, 0),
    );
  });

  it("self-validates as a practice pool through the v2 product checker", () => {
    expect(
      validatePracticePool(
        D4_PRACTICE_POOL,
        { nodes: D4_PRACTICE_NODES, mix: D4_PRACTICE_MIX },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  }, 120_000);

  it("serves each node only the answer types its own questions call for", () => {
    for (const item of D4_PRACTICE_ITEMS) {
      const allowed = NODE_ANSWER_TYPES[item.node_id];
      expect(allowed, item.node_id).toBeDefined();
      expect(allowed, item.item_version_id).toContain(item.answer.answer_spec.answer_type);
    }
  });

  /**
   * The measured constraint, held as a guard rather than as a comment: a star whose left side
   * is a letter is notation the grader cannot read without, and a learner typing the natural
   * starless spelling loses the attempt to `invalid_input`. No key in this pool has that shape,
   * which is why POL.2's L1 takes a numeric common factor.
   */
  it("keys no answer with a star the learner would have to type", () => {
    const offenders = D4_PRACTICE_ITEMS.filter((item) =>
      /[a-z]\s*\*\s*[a-z(]/i.test(String(item.answer.answer_key ?? "")),
    ).map((item) => `${item.item_version_id}: ${item.answer.answer_key}`);
    expect(offenders.join("\n")).toBe("");
    // A floor, because "none of them" over an empty pool proves nothing.
    expect(D4_PRACTICE_ITEMS.length).toBeGreaterThan(40);
  });

  /**
   * R30's leak rule, at the authoring end. `SOLUTION_SET_PLACEHOLDER` prints "Every solution:
   * 13 or {-1, 4}", and the sweep in `answerFormat.test.ts` GRADES both strings against every
   * served solution set, where a bare `13` scores correct against a key of `{13}`. Both rosters
   * are reachable from these shapes' natural ranges, so the draw guards against them and this
   * asserts the guard held.
   */
  it("keys no solution set that the answer field's own example answers", () => {
    const advertised = new Set(["{13}", "{-1, 4}", "{-1,4}"]);
    const rosters = D4_PRACTICE_ITEMS.filter(
      (item) => item.answer.answer_spec.answer_type === "solution_set",
    );
    expect(
      rosters.length,
      "no solution sets served, so this proves nothing",
    ).toBeGreaterThan(15);
    for (const item of rosters) {
      expect(advertised.has(String(item.answer.answer_key)), item.item_version_id).toBe(
        false,
      );
    }
  });

  it("pre-generates distinct retry variants for every template", () => {
    for (const template of D4_PRACTICE_TEMPLATES) {
      const variants = D4_PRACTICE_VARIANTS.filter(
        (item) => item.template_id === template.template_id,
      );
      expect(variants.length, template.template_id).toBe(
        D4_PRACTICE_RETRY_VARIANTS_PER_CELL,
      );
      const varieties = new Set(
        variants.map((item) => template.varietyKey?.(item.template_params) ?? ""),
      );
      expect(varieties.size, template.template_id).toBe(variants.length);
    }
  });

  it("holds no two items with the same content, pool and variants alike", () => {
    const hashes = D4_PRACTICE_ITEMS.map(hashItemDefinition);
    expect(new Set(hashes).size).toBe(hashes.length);
    const ids = D4_PRACTICE_ITEMS.map((item) => item.item_version_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * The isolation claim. POL.1 and POL.2 already carry FROZEN assessment items authored years
   * of commits before this pool, and an item shared between the two would let a learner meet
   * an assessment question in practice.
   */
  it("shares no content with any other pool, assessment items included", () => {
    const others: readonly FrozenItem[] = [
      ...D1_PRACTICE_ITEMS,
      ...D2_PRACTICE_ITEMS,
      ...D3_PRACTICE_ITEMS,
      ...D5_PRACTICE_ITEMS,
      ...D7_PRACTICE_ITEMS,
      ...D8_PRACTICE_ITEMS,
      ...INTERACTIVE_PRACTICE_ITEMS,
    ];
    const foreign = new Set([
      ...others.map(hashItemDefinition),
      ...PRODUCT_ITEM_PACK.map(hashItemDefinition),
      ...D1_ITEM_PACK.map(hashItemDefinition),
      ...D1_WALK_ITEM_PACK.map(hashItemDefinition),
    ]);
    for (const item of D4_PRACTICE_ITEMS) {
      expect(foreign.has(hashItemDefinition(item)), item.item_version_id).toBe(false);
    }
    const foreignIds = new Set([
      ...others.map((item) => item.item_version_id),
      ...PRODUCT_ITEM_PACK.map((item) => item.item_version_id),
    ]);
    for (const item of D4_PRACTICE_ITEMS) {
      expect(foreignIds.has(item.item_version_id), item.item_version_id).toBe(false);
    }
  });

  it("builds a randomized five-slot set for every node, easy to hard", () => {
    let seed = 7;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (const node of D4_PRACTICE_NODES) {
      for (let run = 0; run < 12; run += 1) {
        const set = buildRandomizedD4PracticeSet(node, rng);
        expect(set.length, node).toBe(5);
        expect(set.map((item) => item.difficulty)).toEqual([1, 2, 2, 3, 3]);
        expect(new Set(set.map((item) => item.item_version_id)).size).toBe(5);
        for (const difficulty of [2, 3] as const) {
          const shapes = new Set(
            set.filter((item) => item.difficulty === difficulty).map((i) => i.template_id),
          );
          expect(shapes.size, `${node} L${difficulty}`).toBe(2);
        }
        for (const item of set) {
          expect(item.node_id).toBe(node);
          expect(toProductItemVersions([item])[0]?.node_id).toBe(node);
        }
      }
    }
  });

  it("gives every item one to three hints and an ordered worked solution", () => {
    for (const item of D4_PRACTICE_ITEMS) {
      expect(item.hints.length, item.item_version_id).toBeGreaterThanOrEqual(1);
      expect(item.hints.length, item.item_version_id).toBeLessThanOrEqual(3);
      expect(item.worked_solution.length, item.item_version_id).toBeGreaterThanOrEqual(3);
      for (const step of [...item.hints, ...item.worked_solution]) {
        expect(step.trim().length, item.item_version_id).toBeGreaterThan(0);
        // The em-dash ban reaches item content as well as lesson prose.
        expect(step, item.item_version_id).not.toContain("\u2014");
      }
    }
  });
});

/**
 * Every prompt is worked from its own RENDERED TEXT and the result graded against the key.
 *
 * `validateTemplates` above already grades each key correct, and says in its own comment what
 * it is doing: it reconstructs the answer from the item's DEFINITION and asks the checker to
 * accept it. That proves a key is well-formed and gradable. It cannot prove the key answers
 * the question, because the prompt is never read. Neither can anything derived from
 * `template_params`: those are the numbers the key was computed from, so a params-driven
 * check agrees with the key by construction and passes over the one defect it exists for.
 *
 * The defect is not hypothetical. `d4.pol8.missing-power.l3` computed its dividend's x term
 * as `n + r^2` where the quotient it keys requires `n - r^2`, so it printed
 *
 *     Divide $x^{3} + 13x - 12$ by $x - 3$. The division comes out exactly; give the quotient.
 *
 * and keyed `x^2 + 3x + 4`, which is the quotient of a different cubic. The real quotient is
 * `x^2 + 3x + 22` with remainder 54, so the prompt's promise that it "comes out exactly" was
 * false as well. Every guard in this file passed on it, on 40 samples per template, because
 * every one of them read the params. The sweep below fails on it at the first served item.
 *
 * So {@link deriveFromPrompt} parses the `$...$` spans and works the problem, and the answer
 * it reaches is graded by the REAL product checker rather than string-compared, because a
 * derived `x^2 + 3x + 4` and a key of `x^2 + 3x + 4` may still be spelled differently and only
 * the checker settles it.
 */
describe("every D4 prompt asks for the answer its own key holds", () => {
  /**
   * The population, derived from the pool rather than written down here, and asserted as a
   * SET rather than a count: a template added to a node without a deriver would otherwise sit
   * outside the sweep while the sweep went on passing.
   */
  it("re-derives every shape the pool serves, with none left out", () => {
    const served = [...new Set(D4_PRACTICE_TEMPLATES.map((t) => t.template_id))].sort();
    expect(served.length, "no templates to sweep").toBeGreaterThanOrEqual(25);
    expect([...DERIVABLE_TEMPLATE_IDS].sort()).toEqual(served);
  });

  /**
   * Grade the derived answer over the served pool: the forty frozen slots plus the two
   * hundred and forty retry variants, which are the exact strings a learner meets.
   *
   * The counts are not written down: `D4_PRACTICE_ITEMS` is the pool plus the variants, and
   * the floor below reads off the pool rather than a number in this sentence. It said "the 25
   * frozen slots plus the 150 retry variants" until 2026-08-08, which was true while D4 was
   * five nodes and had been wrong by 105 items since it became eight.
   */
  it("grades the prompt-derived answer correct on every served item", () => {
    const checker = PRODUCT_CHECKER_CONFIG.checker(
      toProductItemVersions(D4_PRACTICE_ITEMS),
    );
    const failures: string[] = [];
    let graded = 0;
    for (const item of D4_PRACTICE_ITEMS) {
      const { spellings, notes } = deriveFromPrompt(item);
      for (const note of notes) {
        failures.push(`${item.item_version_id}: ${note}`);
      }
      if (spellings.length === 0) {
        failures.push(`${item.item_version_id}: nothing derived from "${item.prompt}"`);
        continue;
      }
      for (const spelling of spellings) {
        graded += 1;
        const result = checker({
          raw_answer: spelling,
          item_version_id: item.item_version_id,
          equivalence_checker_version: PRODUCT_CHECKER_CONFIG.checkerVersion,
        });
        if (result.status !== "correct") {
          failures.push(
            `${item.template_id}: prompt "${item.prompt}" works out to ${spelling}, which the checker refuses (${result.status}/${result.reason_code}) against the key ${String(item.answer.answer_key)}`,
          );
        }
      }
    }
    expect(failures.join("\n")).toBe("");
    // Floors, because "no failures" over an empty sweep proves nothing.
    expect(D4_PRACTICE_ITEMS.length, "the served pool").toBeGreaterThanOrEqual(175);
    expect(graded, "answers actually graded").toBeGreaterThanOrEqual(
      D4_PRACTICE_ITEMS.length,
    );
  }, 180_000);

  /**
   * The same derivation over each generator's PARAMETER SPACE rather than over the frozen
   * draws, because a served pool is a sample: the missing-power defect was wrong on every
   * draw, but a defect reachable on one branch in twenty would show here and not there.
   */
  it("grades the prompt-derived answer correct across every generator's parameter space", () => {
    const DRAWS = 40;
    // One checker over every sample rather than one per template: building it is the
    // expensive half (the sweep above it spends about 3.5s per construction), and the
    // registry it builds is keyed by item version, so a single one grades them all.
    const samples = D4_PRACTICE_TEMPLATES.flatMap((template) =>
      Array.from({ length: DRAWS }, (_unused, index) => drawOne(template, 770_000 + index)),
    );
    const checker = PRODUCT_CHECKER_CONFIG.checker(toProductItemVersions(samples));
    const failures: string[] = [];
    let graded = 0;
    for (const sample of samples) {
      const { spellings, notes } = deriveFromPrompt(sample);
      for (const note of notes) {
        failures.push(`${sample.template_id}: ${note}`);
      }
      if (spellings.length === 0) {
        failures.push(`${sample.template_id}: nothing derived from "${sample.prompt}"`);
        continue;
      }
      for (const spelling of spellings) {
        graded += 1;
        const result = checker({
          raw_answer: spelling,
          item_version_id: sample.item_version_id,
          equivalence_checker_version: PRODUCT_CHECKER_CONFIG.checkerVersion,
        });
        if (result.status !== "correct") {
          failures.push(
            `${sample.template_id}: prompt "${sample.prompt}" works out to ${spelling}, which the checker refuses (${result.status}/${result.reason_code}) against the key ${String(sample.answer.answer_key)}`,
          );
        }
      }
    }
    expect(failures.slice(0, 12).join("\n")).toBe("");
    expect(graded, "answers actually graded").toBeGreaterThanOrEqual(
      D4_PRACTICE_TEMPLATES.length * DRAWS,
    );
  }, 300_000);
});

/**
 * A drawn coefficient of zero, printed into a prompt as a term.
 *
 * `signedTerm` renders whatever it is handed, so a generator whose middle coefficient can
 * come out at zero prints `+ 0x` and no author ever sees it: the parameter space is large and
 * the branch is rare. Three of the 25 canonical slots carried one at this pin --
 * `$x^{2} + 0x - 25 = 0$` under "solve by factoring", `$x^{2} + 16x + 0 = 0$` under "solve by
 * completing the square", and `$x^{3} + 0x + 27$` under a node whose entire subject is a
 * power written in as a zero.
 *
 * None of them is wrong arithmetic, which is why nothing else catches them, and two of them
 * break the shape's own teaching: an equation with no constant does not need the square
 * completing, and a trinomial with no middle term is a difference of two squares wearing a
 * disguise. The prompts are swept rather than the params, so a term that is only zero once it
 * is PRINTED is caught the same way as one that is zero in the draw.
 */
describe("no D4 prompt prints a term whose coefficient is zero", () => {
  const DRAWS = 400;

  it("prints no zero term across every generator's parameter space", () => {
    const offenders: string[] = [];
    let swept = 0;
    for (const template of D4_PRACTICE_TEMPLATES) {
      for (let index = 0; index < DRAWS; index += 1) {
        const sample = drawOne(template, 660_000 + index);
        swept += 1;
        // A signed zero term: `+ 0x`, `- 0`, `+ 0x^{2}`. A bare `0` on its own (an equation
        // gathered at zero, a root of zero in a roster) is not one and must stay legal.
        if (/[+-]\s*0(?![.\d])/.test(sample.prompt)) {
          offenders.push(`${template.template_id}: ${sample.prompt}`);
        }
      }
    }
    expect(offenders.slice(0, 8).join("\n")).toBe("");
    expect(swept).toBe(D4_PRACTICE_TEMPLATES.length * DRAWS);
  }, 120_000);

  it("prints no zero term on any of the served items", () => {
    const offenders = D4_PRACTICE_ITEMS.filter((item) =>
      /[+-]\s*0(?![.\d])/.test(item.prompt),
    ).map((item) => `${item.item_version_id}: ${item.prompt}`);
    expect(offenders.join("\n")).toBe("");
    expect(D4_PRACTICE_ITEMS.length).toBeGreaterThanOrEqual(175);
  });

  /**
   * The fix, asserted where it lives rather than only where it was reported.
   *
   * The two sweeps above are over the generators that exist, so they go green the moment the one
   * template that reached a zero coefficient stops reaching it -- by a narrower draw as readily
   * as by a printer that omits the term. This pins the printer, which is what makes the next
   * caller safe: `signedTerm` prints nothing for a zero, and `termSum` closes the gap the
   * missing term leaves rather than leaving a double space behind it.
   */
  it("omits a zero term at the printer, for every caller and not just today's", () => {
    expect(signedTerm(0, "x^{2}")).toBe("");
    expect(signedTerm(0, "x")).toBe("");
    expect(signedTerm(0, "")).toBe("");
    // Everything else still prints exactly as it did.
    expect(signedTerm(3, "x")).toBe("+ 3x");
    expect(signedTerm(-1, "x^{2}")).toBe("- x^{2}");
    expect(signedTerm(7, "")).toBe("+ 7");
    // And a line assembled from a dropped term has no gap where it used to be.
    expect(termSum("x^{3}", signedTerm(0, "x^{2}"), signedTerm(-4, "x"))).toBe(
      "x^{3} - 4x",
    );
    expect(termSum("x^{3}", signedTerm(2, "x^{2}"), signedTerm(-4, "x"))).toBe(
      "x^{3} + 2x^{2} - 4x",
    );
    expect(/[+-]\s*0(?![.\d])/.test(termSum("x^{3}", signedTerm(0, "x^{2}")))).toBe(false);
  });

  /**
   * The rule this sweep must NOT have become: a bare zero is legal and three shapes need it.
   * Without this, tightening the regex to `/0/` would pass the sweep above and quietly forbid
   * every equation gathered at zero.
   */
  it("still allows a bare zero, which three shapes are built on", () => {
    const gathered = D4_PRACTICE_ITEMS.filter((item) => item.prompt.includes("= 0$"));
    expect(gathered.length, "no equation gathered at zero").toBeGreaterThan(10);
    for (const item of gathered) {
      expect(/[+-]\s*0(?![.\d])/.test(item.prompt), item.prompt).toBe(false);
    }
  });
});

/*
 * The unit-coefficient sweep that used to sit here now lives in `unitCoefficient.test.ts` and
 * covers the whole bank.
 *
 * It was moved rather than copied, because two sweeps of one rule drift. Its population here
 * was `D4_PRACTICE_TEMPLATES`, scoped that way on the reasoning that D4's prompts are built
 * from the `coeff`/`signedTerm` pair in `d4/nodes/_shared.ts` and so are the only ones
 * promising to suppress a one. That scoped the guard to an implementation while the defect
 * belongs to any generator interpolating a drawn coefficient: measured over 348 templates,
 * six were printing `1x` and not one of them was D4. Worse, the defect was live inside D4 and
 * past the end of this sweep's SURFACE -- `d4.pol8.synthetic-cubic.l2` keyed `x^2 + 1x + 5`
 * while the step beside it printed `x^{2} + x + 5` -- because prompts, hints and steps were
 * swept and the answer key was not.
 */

/**
 * NO D4 STEP PRINTS A NEGATIVE NUMBER RAISED TO A POWER WITHOUT BRACKETS.
 *
 * `d4.pol4.formula.l3` printed its discriminant step as `$${b}^{2} - 4 \times ...$` over a
 * `b = a * q - p` that is negative whenever `a * q < p`. On those draws the step reads
 * *"The discriminant is $-1^{2} - 4 \times 2 \times (-6) = 49$"*, and $-1^{2}$ is $-1$: the
 * equation printed is false as written, by exactly the precedence rule the line is teaching the
 * learner to respect. The same node's L2a step already brackets it (`$(${b})^{2}$`), and so does
 * the authored lecture beside it — `content/lessons/d4/POL.4.json` worked example 4, step 2,
 * *"The discriminant is $(-6)^{2} - 4 \times 2 \times 5 = 36 - 40$"* — so the generated prose and
 * the authored prose disagreed about the one piece of notation this shape turns on.
 *
 * ## Scope
 *
 * Every learner-visible string of every D4 template, over the parameter space and over the
 * served items, because any prompt, hint or step that interpolates a SIGNED value in front of a
 * `^` can exhibit it, and which draws do is a property of the range rather than of the shape.
 * Restricted to a NUMERIC base: `-x^{2}` is standard notation for $-(x^{2})$ and is what every
 * one of these templates means by it.
 */
describe("no D4 step raises a negative number to a power without brackets", () => {
  const DRAWS = 400;

  /**
   * A `-` that is a SIGN rather than a subtraction, on a number that is then raised to a power.
   *
   * The lookbehind is what separates the two readings, and it is the whole guard: in
   * `$36-40^{2}$` the minus is binary and the base is a positive 40, which is correct notation
   * however unpleasant it looks, while in `$-9^{2}$` the minus belongs to the 9 and the printed
   * value is not the value asserted.
   */
  const UNBRACKETED_NEGATIVE_BASE = /(?<![\d}\w)])-\d+\^/;

  const learnerVisibleStrings = (sample: {
    prompt: string;
    hints?: readonly string[];
    worked_solution?: readonly string[];
  }): readonly [string, string][] => [
    ["prompt", sample.prompt],
    ...(sample.hints ?? []).map((text, i) => [`hint ${i}`, text] as [string, string]),
    ...(sample.worked_solution ?? []).map(
      (text, i) => [`step ${i}`, text] as [string, string],
    ),
  ];

  it("brackets every negative base across every generator's parameter space", () => {
    const offenders = new Map<string, string>();
    let swept = 0;
    for (const template of D4_PRACTICE_TEMPLATES) {
      for (let index = 0; index < DRAWS; index += 1) {
        const sample = drawOne(template, 990_000 + index);
        swept += 1;
        for (const [where, text] of learnerVisibleStrings(sample)) {
          if (UNBRACKETED_NEGATIVE_BASE.test(text)) {
            offenders.set(`${template.template_id} (${where})`, text);
          }
        }
      }
    }
    expect([...offenders].map(([key, text]) => `${key}: ${text}`).join("\n")).toBe("");
    expect(swept).toBe(D4_PRACTICE_TEMPLATES.length * DRAWS);
  }, 120_000);

  it("brackets every negative base on every served item", () => {
    const offenders: string[] = [];
    let read = 0;
    for (const item of D4_PRACTICE_ITEMS) {
      for (const [where, text] of learnerVisibleStrings(item)) {
        read += 1;
        if (UNBRACKETED_NEGATIVE_BASE.test(text)) {
          offenders.push(`${item.item_version_id} (${where}): ${text}`);
        }
      }
    }
    expect(offenders.join("\n")).toBe("");
    expect(D4_PRACTICE_ITEMS.length, "the served pool").toBeGreaterThanOrEqual(175);
    expect(read, "learner-visible strings read").toBeGreaterThanOrEqual(1000);
  });

  /**
   * The rule this must NOT have become. `/-\d+\^/` alone forbids `$36-40^{2}$`, which is a
   * subtraction and correct, and a guard that fires on correct prose is a guard people edit
   * around.
   */
  it("still allows a subtraction, a bracketed sign, and a negated variable", () => {
    for (const legal of [
      "$36-40^{2}$",
      "$(-6)^{2} - 4 \\times 2 \\times 5$",
      "$-x^{2} + 3x$",
      "$x^{2} - 4^{2}$",
      "$b^{2} - 4ac$",
    ]) {
      expect(
        UNBRACKETED_NEGATIVE_BASE.test(legal),
        `${legal} is legal and was flagged`,
      ).toBe(false);
    }
    for (const defect of [
      "The discriminant is $-9^{2} - 4 \\times 2 \\times (4) = 49$.",
      "$-1^{2}$",
      "gives $\\times -3^{2}$",
    ]) {
      expect(UNBRACKETED_NEGATIVE_BASE.test(defect), `${defect} was missed`).toBe(true);
    }
    expect(D4_PRACTICE_TEMPLATES.length, "no D4 templates to sweep").toBeGreaterThanOrEqual(
      25,
    );
  });
});

/**
 * A fraction inside a solution-set key, in lowest terms.
 *
 * A key is a STRING and nothing downstream reduces it. `d4.pol4.formula.l3` filtered its
 * numerator with `p % a !== 0`, which is the test that the root is not a WHOLE number and not
 * the test that it is in lowest terms: at `a = 4` it admitted `p = 2`, and two of the 175
 * served items were keyed `{-6, 2/4}` and `{-2, 2/4}`. The reveal prints
 * `x = \dfrac{2}{4}` as the final line of a worked solution whose subject is the quadratic
 * formula, so the learner is shown an unreduced fraction as the model answer.
 */
describe("every D4 fraction in a key is in lowest terms", () => {
  const unreduced = (key: string): string[] =>
    [...key.matchAll(/(-?\d+)\/(-?\d+)/g)]
      .filter(([, top, bottom]) => {
        let a = Math.abs(Number(top));
        let b = Math.abs(Number(bottom));
        while (b !== 0) {
          [a, b] = [b, a % b];
        }
        return a !== 1;
      })
      .map(([whole]) => whole);

  it("keys no unreduced fraction on any served item", () => {
    const offenders = D4_PRACTICE_ITEMS.flatMap((item) => {
      const key = String(item.answer.answer_key ?? "");
      return unreduced(key).map(
        (fraction) => `${item.item_version_id}: ${fraction} in ${key}`,
      );
    });
    expect(offenders.join("\n")).toBe("");
    // A floor on the population that can HOLD a fraction, or this passes over a pool that
    // stopped serving one at all.
    const withFraction = D4_PRACTICE_ITEMS.filter((item) =>
      String(item.answer.answer_key ?? "").includes("/"),
    );
    expect(withFraction.length, "no fractional key served").toBeGreaterThanOrEqual(7);
  });

  it("keys no unreduced fraction across the formula shape's parameter space", () => {
    const formula = D4_PRACTICE_TEMPLATES.find(
      (t) => t.template_id === "d4.pol4.formula.l3",
    ) as ItemTemplate;
    const offenders: string[] = [];
    const DRAWS = 500;
    for (let index = 0; index < DRAWS; index += 1) {
      const key = String(drawOne(formula, 550_000 + index).answer.answer_key);
      for (const fraction of unreduced(key)) {
        offenders.push(`${fraction} in ${key}`);
      }
    }
    expect(offenders.slice(0, 8).join("\n")).toBe("");
    // The shape's whole point is that one root is a genuine fraction, so every draw has one.
    expect(offenders.length).toBe(0);
  });
});

/**
 * L3 is harder than the shape it extends, asserted as a NAMED extra step per template.
 *
 * "Harder" cannot be read off `difficulty`, which is a declaration. The standard the tree
 * already uses is `d2.test.ts`'s: name the step the lower-level shape cannot ask for and
 * assert it structurally. Each row below is checked in BOTH directions -- the step is present
 * on every draw of the L3, and absent from every draw of the shape it extends -- so neither a
 * regression in the L3 nor a lower shape that has drifted up into it can pass.
 *
 * POL.8 is the row to read carefully. Its ladder runs on two tracks rather than one: L1 and
 * L3a are the remainder theorem, L2b and L3b are division. So L3a is compared against the L1
 * it extends and not against the L2 beside it, which its module header states as the design.
 * Read the ladder the other way and L3a looks like a regression -- one substitution where L2b
 * asks for a three-row synthetic division -- and that reading is recorded in the findings
 * fragment rather than asserted here, because the file says what it intended.
 */
describe("each D4 L3 shape asks a step the shape it extends cannot", () => {
  /**
   * The coefficient a prompt prints on `x` or on `x^{2}`, or 1 where it prints none.
   *
   * READ rather than pattern-matched, because `/\d+x/` is satisfied by a printed `1x`, and a
   * generator whose range slipped down to 1 prints exactly that. Measured: dropping
   * `d4.pol2.leading.l3` to `a = 1` left the prompt reading `Factor completely: $1x^{2} +
   * 7x + 6$` and the pattern-matching version of this row passed on all 120 draws, so the
   * guard would have been green over a template that had lost the step it exists to assert.
   */
  const coefficientsOn = (prompt: string, power: string): number[] =>
    [...prompt.matchAll(new RegExp(`[$+\\-] ?(\\d*)${power}(?![\\^\\dy])`, "g"))].map(
      (match) => Number(match[1] === "" ? "1" : match[1]),
    );

  const EXTRA_STEP: readonly {
    readonly harder: string;
    readonly extends: string;
    readonly step: string;
    readonly shows: (item: FrozenItem) => boolean;
  }[] = [
    {
      harder: "d4.pol1.leading.l3",
      extends: "d4.pol1.binomial.l2",
      step: "a coefficient above one on the x of BOTH sides, so the middle products differ",
      shows: (item) => {
        const leads = coefficientsOn(item.prompt, "x");
        return leads.length === 2 && leads.every((value) => value > 1);
      },
    },
    {
      harder: "d4.pol1.two-variable.l3",
      extends: "d4.pol1.binomial.l2",
      step: "a second variable, so only two of the four products are like terms",
      /**
       * Both printed lengths carry an `x` piece AND a `y` piece, which is what makes two of the
       * four products cross terms. Read as a shape rather than as `/\d+y/`, for the reason the
       * `coefficientsOn` note gives one paragraph up and for its mirror image: `\d+` requires a
       * DIGIT on the `y`, so the row went red the moment the template stopped printing `1y` and
       * spelled a unit coefficient the way the rest of the pool does. The claim was never that
       * the coefficient is bigger than one; it is that there is a second variable at all.
       */
      shows: (item) => [...item.prompt.matchAll(/\$-?\d*x \+ \d*y\$/g)].length === 2,
    },
    {
      harder: "d4.pol2.leading.l3",
      extends: "d4.pol2.trinomial.l2",
      step: "a leading coefficient above one, so the pair search runs over two lists at once",
      shows: (item) => {
        const leads = coefficientsOn(item.prompt, "x\\^\\{2\\}");
        return leads.length > 0 && leads.every((value) => value > 1);
      },
    },
    {
      harder: "d4.pol2.grouping.l3",
      extends: "d4.pol2.trinomial.l2",
      step: "a cubic in four terms, which no pair search reaches",
      shows: (item) => /x\^\{3\}/.test(item.prompt),
    },
    {
      harder: "d4.pol3.area.l3",
      extends: "d4.pol3.factor.l2",
      step: "an equation NOT yet gathered at zero, so nothing can be split until it is",
      shows: (item) => !item.prompt.includes("= 0"),
    },
    {
      harder: "d4.pol3.lost-root.l3",
      extends: "d4.pol3.factor.l2",
      step: "the variable on both sides, where dividing through discards a root",
      shows: (item) => /=\s*\d*x/.test(item.prompt),
    },
    {
      harder: "d4.pol4.complete-solve.l3",
      extends: "d4.pol4.right-side.l2",
      step: "the completion carried through to the roots rather than stopped at one number",
      shows: (item) => item.answer.answer_spec.answer_type === "solution_set",
    },
    {
      harder: "d4.pol4.formula.l3",
      extends: "d4.pol4.complete-solve.l3",
      step: "a leading coefficient above one, so one root is a genuine fraction",
      shows: (item) => String(item.answer.answer_key ?? "").includes("/"),
    },
    {
      harder: "d4.pol5.x-intercepts-expanded.l3",
      extends: "d4.pol5.extreme-value-standard.l2",
      step: "a pair of crossings rather than one height, and no way to either until the trinomial is split into brackets",
      /**
       * A roster key. Both shapes are handed the same thing, a quadratic in standard form, and
       * the L2's route runs entirely through the coefficients: the vertex from `-b/2a`, then a
       * substitution. Nothing on that route factors anything, and nothing on it could produce a
       * second answer. So the answer TYPE is what separates them, exactly as it does for
       * `d4.pol4.complete-solve.l3` against the shape it extends.
       */
      shows: (item) => item.answer.answer_spec.answer_type === "solution_set",
    },
    {
      harder: "d4.pol5.extreme-from-factored.l3",
      extends: "d4.pol5.extreme-value-standard.l2",
      step: "the rule arriving in brackets, so the standard-form formula has nothing to read until the symmetry between the crossings is used instead",
      /**
       * A bracketed linear factor on the page. Matched on `(x` FOLLOWED BY a space and a sign,
       * so the `f(x)` naming the function is not mistaken for one: the L2 shape prints a sum of
       * powers and its only bracket is that name, where this shape prints two factors.
       */
      shows: (item) => /\(x [+-] /.test(item.prompt),
    },
    {
      harder: "d4.pol6.product-leading-term.l3",
      extends: "d4.pol6.leading-term-factored.l2",
      step: "a bracket written with its CONSTANT first, so reading positions takes the wrong term",
      /**
       * A bracket whose opening term is a bare signed number rather than a power of `x`. The L2
       * shape writes every bracket with its `x` term in front (`(3x - 4)`, `(x - 3)^{2}`), so
       * position and power agree there and the leading term can be read off the left edge; this
       * shape writes one bracket as `(3 + 2x^{2})`, where they disagree.
       */
      shows: (item) => /\(-?\d+ [+-] /.test(item.prompt),
    },
    {
      harder: "d4.pol6.ends-after-transform.l3",
      extends: "d4.pol6.leading-coefficient-jumbled.l2",
      step: "a transformation standing between the polynomial and the answer, which is a direction",
      shows: (item) => /g\(x\) = (-f\(x\)|f\(-x\))/.test(item.prompt),
    },
    {
      harder: "d4.pol7.zeros-from-expanded.l3",
      extends: "d4.pol7.zeros-from-factored.l1",
      step: "a polynomial with no bracket on the page, so nothing is a zero until it is factored",
      /**
       * No factor bracket anywhere in the prompt. Matched on `(x` FOLLOWED BY an operator, so
       * the `f(x)` naming the function is not mistaken for a factor: the L1 shape always prints
       * at least one `(x + n)` or `(x - n)` and this shape prints a sum of powers.
       */
      shows: (item) => !/\(x [+-]/.test(item.prompt),
    },
    {
      harder: "d4.pol7.build-from-graph.l3",
      extends: "d4.pol7.multiplicity-at-zero.l2",
      step: "no polynomial on the page at all, so the notation has to be produced and not read",
      shows: (item) => !item.prompt.includes("f(x) ="),
    },
    {
      harder: "d4.pol8.leading-remainder.l3",
      extends: "d4.pol8.remainder.l1",
      step: "a leading coefficient above one multiplying the SQUARE, so squaring comes first",
      shows: (item) => {
        const leads = coefficientsOn(item.prompt, "x\\^\\{2\\}");
        return leads.length > 0 && leads.every((value) => value > 1);
      },
    },
    {
      harder: "d4.pol8.missing-power.l3",
      extends: "d4.pol8.synthetic-cubic.l2",
      step: "a cubic with the squared column absent, which has to be written in as a zero",
      shows: (item) => /x\^\{3\}/.test(item.prompt) && !/x\^\{2\}/.test(item.prompt),
    },
  ];

  const draw = (templateId: string, count: number): FrozenItem[] => {
    const template = D4_PRACTICE_TEMPLATES.find((t) => t.template_id === templateId);
    if (!template) {
      throw new Error(`no template ${templateId}`);
    }
    return Array.from({ length: count }, (_unused, index) =>
      drawOne(template, 440_000 + index),
    );
  };

  it("names an extra step for every L3 shape the pool serves", () => {
    const l3 = D4_PRACTICE_TEMPLATES.filter((t) => t.difficulty === 3).map(
      (t) => t.template_id,
    );
    expect(l3.length, "no L3 shapes").toBeGreaterThanOrEqual(10);
    expect(EXTRA_STEP.map((row) => row.harder).sort()).toEqual([...l3].sort());
  });

  it.each(EXTRA_STEP)(
    "$harder shows $step, which $extends never does",
    ({ harder, extends: easier, step, shows }) => {
      const hard = draw(harder, 120);
      for (const item of hard) {
        expect(shows(item), `${harder} lost "${step}": ${item.prompt}`).toBe(true);
      }
      const easy = draw(easier, 120);
      for (const item of easy) {
        expect(shows(item), `${easier} has drifted into "${step}": ${item.prompt}`).toBe(
          false,
        );
      }
      expect(hard.length + easy.length).toBe(240);
    },
  );
});

/**
 * No served set repeats an answer across its five slots.
 *
 * Two slots keyed the same value let a learner carry one answer to the next question and be
 * told it is right, which reads as a coincidence to them and as a scoring bug to nobody.
 * The pool guards distinct SHAPES per difficulty cell already; distinct ANSWERS is a
 * different claim, and the reshuffle draws a fresh variant per slot, so it is the RANDOMIZED
 * set and not just the frozen pool that has to be swept.
 */
describe("no D4 set serves the same answer twice", () => {
  it("draws no repeated answer over 400 reshuffles of every node", () => {
    let seed = 11;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const RUNS = 400;
    const repeats: string[] = [];
    let sets = 0;
    for (const node of D4_PRACTICE_NODES) {
      for (let run = 0; run < RUNS; run += 1) {
        const set = buildRandomizedD4PracticeSet(node, rng);
        sets += 1;
        const keys = set.map((item) => String(item.answer.answer_key));
        if (new Set(keys).size !== keys.length) {
          repeats.push(`${node}: ${keys.join(" | ")}`);
        }
      }
    }
    expect(repeats.slice(0, 5).join("\n")).toBe("");
    expect(sets).toBe(D4_PRACTICE_NODES.length * RUNS);
  }, 120_000);

  it("serves no repeated answer within any frozen five-slot set", () => {
    for (const node of D4_PRACTICE_NODES) {
      const keys = D4_PRACTICE_POOL.filter((item) => item.node_id === node).map((item) =>
        String(item.answer.answer_key),
      );
      expect(keys.length, node).toBe(5);
      expect(new Set(keys).size, `${node}: ${keys.join(" | ")}`).toBe(5);
    }
  });
});

/**
 * THE CONTENT PIN D4 NEVER GOT, in the shape its nine siblings already use.
 *
 * `docs/qa-mechanical-2026-08-08.md` F1: every other domain freezes its pool's ids and
 * content hashes under a uniformly named guard, and thirteen `.snap` files back thirteen such
 * guards. `d4.test.ts` held zero occurrences of `toMatchSnapshot`, and
 * `git log --all -- src/__snapshots__/d4.test.ts.snap` returned nothing, so this was an
 * omission from the start rather than a deletion. Proven at the id level rather than by grep
 * shape: none of the forty `D4_PRACTICE_POOL` item ids appeared in any of the thirteen
 * snapshots.
 *
 * The consequence was specific and it was the round's own blind spot. `hashItemDefinition`
 * hashes `node_id`, `prompt` and `answer` together, so a prompt is INSIDE the hash and the
 * repo's rule that a prose edit to an item-bank prompt must surface as a moved snapshot hash
 * had nothing to move for the largest unpinned pool in the tree. D4 looked covered because
 * its POL.1/POL.2 ASSESSMENT items are pinned as `prod.pol-*` in `product.test.ts.snap`; the
 * forty-item PRACTICE pool was not.
 *
 * Everything above this line reads the pool's structure — five slots a node, two shapes a
 * cell, no repeated key, no zero term. All of it survives a template whose prompt or key
 * changed to a different but equally well-formed one. That is what this pins and they do not.
 *
 * The hashes were derived independently before being accepted: `hashItemDefinition` is
 * FNV-1a/32 over `JSON.stringify({node_id, prompt, answer})`, and a separate implementation
 * of that walk reproduced all forty. The pin was then perturbed — one character into
 * `d4.pol1.binomial.l2`'s prompt — and watched to go red on that item's hash before being
 * reverted.
 */
describe("D4 pool content pin (a template edit that changes the pool must be explicit)", () => {
  it("pins the frozen D4 practice pool ids + content hashes", () => {
    const snapshot = D4_PRACTICE_POOL.map((item) => ({
      id: item.item_version_id,
      node: item.node_id,
      difficulty: item.difficulty,
      hash: hashItemDefinition(item),
    }));
    // A floor beside the pin, because a snapshot of an empty array matches itself happily
    // and would report green over a pool that had stopped being built.
    expect(snapshot.length, "the D4 pool is empty or short").toBe(
      D4_PRACTICE_NODES.length *
        D4_PRACTICE_MIX.reduce((total, cell) => total + cell.count, 0),
    );
    expect(snapshot).toMatchSnapshot();
  });
});
