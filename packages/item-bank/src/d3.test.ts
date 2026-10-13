// No `@types/node` in this tree, by the decision recorded at the head of `d6.test.ts`, which
// makes the same source-reading check. The call runs under vitest's node runtime.
// @ts-expect-error - no @types/node in this tree
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { toProductItemVersions } from "./bank";
import {
  ADVERTISED_INTERVALS,
  INTERVAL_PLACEHOLDER_TEXT,
  rayKey,
  unadvertisedBound,
  unadvertisedUnionLow,
  unionKey,
} from "./d3/nodes/_shared";
import { D1_ITEM_PACK, D1_PRACTICE_ITEMS, D1_WALK_ITEM_PACK } from "./d1";
// TEMPORARY, and deleted with the demonstration pin. See `demoPinnedTemplates.ts`.
import {
  DEMO_PINNED_TEMPLATE_IDS,
  drawsOneInstanceOnly,
  isDemoPinned,
} from "./demoPinnedTemplates";
import { D2_PRACTICE_ITEMS } from "./d2";
import { D5_PRACTICE_ITEMS } from "./d5";
import { D7_PRACTICE_ITEMS } from "./d7";
import { D8_PRACTICE_ITEMS } from "./d8";
import {
  buildRandomizedD3PracticeSet,
  D3_PRACTICE_ITEMS,
  D3_PRACTICE_MIX,
  D3_PRACTICE_NODES,
  D3_PRACTICE_POOL,
  D3_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D3_PRACTICE_TEMPLATES,
  D3_PRACTICE_VARIANTS,
  LIN1_TEMPLATES,
  LIN3_TEMPLATES,
  LIN4_TEMPLATES,
  LIN5_TEMPLATES,
  LIN6_TEMPLATES,
} from "./index";
import { INTERACTIVE_PRACTICE_ITEMS } from "./interactive/practice";
import { PRODUCT_ITEM_PACK } from "./product";
import { hashItemDefinition, type ItemDifficulty } from "./schema";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "./template";
import {
  PRODUCT_CHECKER_CONFIG,
  validatePracticePool,
  validateTemplates,
} from "./validate";

/**
 * The D3 (Linear Equations, Inequalities & Absolute Value) practice pool. It pins the five-slot
 * pool per node and proves the pool self-validates through the v2 PRODUCT checker, composes the
 * locked five-slot mix, reshuffles without repeating a problem SHAPE, and is fully isolated from
 * every other pool, including the frozen LIN.1 product ASSESSMENT item (`prod.lin-1.l2`) and the
 * LIN.5/LIN.6 golden anchors, none of which this slice touches.
 *
 * Three D3-specific invariants are asserted here rather than left to a reader's care:
 *
 *  - **LIN.2 is absent, because it is RETIRED.** `skill_graph.json` records it as retired and
 *    excluded from the product, with its skill moved to RAT.6 in D5. Asserting the absence keeps
 *    that a recorded decision rather than something that looks like an oversight.
 *  - **This is the first SERVED cohort of plain `interval` items in the bank.** Every interval item
 *    before it declared `required_notation: "set_builder"`, so the three input rules
 *    `INTERVAL_PLACEHOLDER` carries reached no learner. Two of them are now authoring constraints
 *    here and are pinned: a union key is whitespace-delimited, and no key is an empty set, which
 *    has no interval spelling at all.
 *  - **No answer field's own example answers a served item.** R30's leak check has to GRADE rather
 *    than string-match, because a key of `{4}` is not the string `4` and a bare `4` scores correct
 *    against it. Both advertised strings are graded through the real checker below.
 */

/** The answer types each node is allowed to serve. */
const NODE_ANSWER_TYPES: Readonly<Record<string, readonly string[]>> = {
  "LIN.1": ["solution_set", "numeric"],
  "LIN.3": ["numeric"],
  "LIN.4": ["interval"],
  "LIN.5": ["solution_set"],
  "LIN.6": ["interval"],
};

/** Every D3 template, so a sweep cannot silently skip a node. */
const ALL_D3_TEMPLATES: readonly ItemTemplate[] = D3_PRACTICE_TEMPLATES;

describe("D3 practice templates (Linear Equations, Inequalities & Absolute Value)", () => {
  it("authors every node's templates under its real node id with d3 ids", () => {
    const byNode: readonly (readonly [string, readonly ItemTemplate[], string])[] = [
      ["LIN.1", LIN1_TEMPLATES, "d3.lin1."],
      ["LIN.3", LIN3_TEMPLATES, "d3.lin3."],
      ["LIN.4", LIN4_TEMPLATES, "d3.lin4."],
      ["LIN.5", LIN5_TEMPLATES, "d3.lin5."],
      ["LIN.6", LIN6_TEMPLATES, "d3.lin6."],
    ];
    for (const [nodeId, templates, prefix] of byNode) {
      expect(templates.length, nodeId).toBeGreaterThanOrEqual(5);
      for (const template of templates) {
        expect(template.node_id, template.template_id).toBe(nodeId);
        expect(template.template_id.startsWith(prefix), template.template_id).toBe(true);
      }
    }
    expect(ALL_D3_TEMPLATES).toHaveLength(
      LIN1_TEMPLATES.length +
        LIN3_TEMPLATES.length +
        LIN4_TEMPLATES.length +
        LIN5_TEMPLATES.length +
        LIN6_TEMPLATES.length,
    );
  });

  /**
   * LIN.2 is the id the domain's second node used to carry. `skill_graph.json` records it as
   * `status: "retired"` / `product_scope: "excluded"` with the note "rational equations moved to
   * RAT.6", so the skill lives in D5 and the id is permanently dead: retired ids are never reused.
   */
  it("does not author LIN.2, whose id is retired and whose skill moved to RAT.6", () => {
    expect(D3_PRACTICE_NODES).not.toContain("LIN.2");
    for (const template of ALL_D3_TEMPLATES) {
      expect(template.node_id, template.template_id).not.toBe("LIN.2");
    }
    // The registered nodes are exactly the ones with templates, so no node in the pool can be
    // missing a shape and no shape can belong to an unregistered node.
    expect([...D3_PRACTICE_NODES].sort()).toEqual(
      [...new Set(ALL_D3_TEMPLATES.map((t) => t.node_id))].sort(),
    );
  });

  /**
   * SHAPE DEPTH, which is a claim about what a cell CAN fill and not about what it serves.
   *
   * This used to pin `atLevel.length` to the slot count exactly, and the exact form was doing two
   * jobs at once: it said every slot can be filled by a different question, which is the claim
   * worth keeping, and it also said no cell may hold a shape the mix does not serve, which was
   * never the point and blocked `d3.lin4.compound-or.l2` from existing. That shape is authored for
   * the CHECK's re-ask rather than for a pool slot (`cfuAnswerShape.test.tsx`), so LIN.4's L2 cell
   * holds three shapes and the pool still serves two of them.
   *
   * So it is loosened to a floor, exactly as D1's equivalent reads (`d1.test.ts:309-322`, "holds
   * two or more shapes in every two-slot cell"), and what the exact form additionally guarded is
   * asserted on its own below, against the frozen pool rather than against the registry.
   */
  it("holds at least as many distinct shapes at each level as the mix has slots", () => {
    for (const [nodeId, templates] of [
      ["LIN.1", LIN1_TEMPLATES],
      ["LIN.3", LIN3_TEMPLATES],
      ["LIN.4", LIN4_TEMPLATES],
      ["LIN.5", LIN5_TEMPLATES],
      ["LIN.6", LIN6_TEMPLATES],
    ] as const) {
      for (const [difficulty, slots] of [
        [1, 1],
        [2, 2],
        [3, 2],
      ] as const) {
        const atLevel = templates.filter((t) => t.difficulty === difficulty);
        // Every slot must be fillable by a genuinely different problem shape.
        expect(atLevel.length, `${nodeId} L${difficulty}`).toBeGreaterThanOrEqual(slots);
        // And no two of them may be the same shape wearing one id twice, whatever the count.
        expect(
          new Set(atLevel.map((t) => t.template_id)).size,
          `${nodeId} L${difficulty}`,
        ).toBe(atLevel.length);
      }
    }
  });

  /**
   * WHAT THE POOL SERVES, which is the half the loosening above would otherwise have dropped.
   *
   * The exact pin said two things at once, and only one of them was about the registry. The other
   * was that a learner's two L2 slots hold two DIFFERENT questions, which followed from the cell
   * holding exactly two shapes and `buildPool` round-robining over them. Loosening the shape count
   * removes that entailment, so the served side is asserted directly: the locked number of
   * instances per cell, no two of them the same shape, and every one of them a shape the cell
   * actually registers.
   *
   * The counts are written as literals rather than read back out of `D3_PRACTICE_MIX`, so a change
   * to the mix itself fails here instead of being echoed back at itself.
   *
   * WHICH shapes fill the slots is deliberately not asserted here, and the reason is worth stating
   * because the obvious form of it is worthless. "The cell's first `count` entries in registry
   * order" is `buildPool`'s own implementation restated, so it passes over the very edit it looks
   * like it forbids: measured by moving `compound-or.l2` in front of the two served shapes, that
   * assertion stayed green while `__snapshots__/d3.test.ts.snap` moved two ids and two hashes. The
   * snapshot is the pin on identity and it is the one that failed, so this test is scoped to the
   * properties the snapshot does not spell out.
   */
  it("serves the locked instance count per cell, from distinct shapes the cell registers", () => {
    const LOCKED: readonly (readonly [ItemDifficulty, number])[] = [
      [1, 1],
      [2, 2],
      [3, 2],
    ];
    expect(
      D3_PRACTICE_MIX.map((slot) => [slot.difficulty, slot.count]),
      "the mix is no longer the locked 1xL1 / 2xL2 / 2xL3 one",
    ).toEqual(LOCKED.map((entry) => [...entry]));

    for (const node of D3_PRACTICE_NODES) {
      for (const [difficulty, count] of LOCKED) {
        const served = D3_PRACTICE_POOL.filter(
          (item) => item.node_id === node && item.difficulty === difficulty,
        );
        expect(served.length, `${node} L${difficulty} instance count`).toBe(count);
        const cellShapes = new Set(
          ALL_D3_TEMPLATES.filter(
            (template) => template.node_id === node && template.difficulty === difficulty,
          ).map((template) => template.template_id),
        );
        const servedShapes = served.map((item) => item.template_id);
        expect(
          new Set(servedShapes).size,
          `${node} L${difficulty} fills two slots with one shape, so a learner is asked the same question twice`,
        ).toBe(count);
        expect(
          servedShapes.filter((id) => !cellShapes.has(id)),
          `${node} L${difficulty} serves a shape the cell does not register`,
        ).toEqual([]);
      }
    }
    expect(D3_PRACTICE_POOL.length, "the pool is not five slots per node").toBe(
      D3_PRACTICE_NODES.length * 5,
    );
  });

  // Interval and solution-set compares run through the structural comparators and cost far more
  // per item than a plain numeric compare, so these sweeps need more than vitest's 5s default
  // (see d5.test.ts, d7.test.ts, d8.test.ts and product.test.ts, which budget the same way).
  it("every sampled instance of EVERY template self-validates through the v2 product checker", () => {
    expect(validateTemplates(ALL_D3_TEMPLATES, 40, PRODUCT_CHECKER_CONFIG)).toEqual([]);
  }, 60_000);

  it("the frozen practice pool composes the five-slot mix and self-validates", () => {
    expect(
      validatePracticePool(
        D3_PRACTICE_POOL,
        { nodes: D3_PRACTICE_NODES, mix: D3_PRACTICE_MIX },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  }, 60_000);

  /**
   * The reveal-to-retry variants are the instances a learner reaches by revealing a slot, and
   * there are roughly six times as many of them as there are pool items. Composition is skipped
   * (variants are not a five-slot mix); every other pool invariant applies.
   */
  it("every retry variant is a distinct, gradable practice item too", () => {
    expect(D3_PRACTICE_VARIANTS.length).toBeGreaterThan(D3_PRACTICE_POOL.length);
    expect(
      validatePracticePool(
        D3_PRACTICE_VARIANTS,
        { nodes: [], mix: [] },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  }, 60_000);
});

describe("D3 answers stay in the types their questions call for", () => {
  it("serves each node only its allowed answer types", () => {
    for (const [nodeId, allowed] of Object.entries(NODE_ANSWER_TYPES)) {
      const items = D3_PRACTICE_ITEMS.filter((item) => item.node_id === nodeId);
      expect(items.length, nodeId).toBeGreaterThan(0);
      for (const item of items) {
        expect(allowed, item.item_version_id).toContain(
          item.answer.answer_spec.answer_type,
        );
      }
    }
  });

  /**
   * LIN.3 answers with a NUMBER on every shape, and the reason is a measured checker limitation
   * rather than an authoring preference: a multi-variable expression key does not grade correct
   * even against itself, because `symbolicEqual` reads the numerator of a `math.rationalize`
   * difference and `rationalize` does not cancel over several names. If that ever changes, this
   * assertion is the place the decision is recorded, so it should fail rather than drift.
   */
  it("keeps every LIN.3 answer numeric, because a rearranged rule is not gradable", () => {
    const items = D3_PRACTICE_ITEMS.filter((item) => item.node_id === "LIN.3");
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.answer.answer_spec.answer_type, item.item_version_id).toBe("numeric");
      expect(item.answer.allowed_symbols, item.item_version_id).toBeUndefined();
    }
  });

  /**
   * The two structural comparators grade a FORM as well as a value, so a shape that acquired a
   * representation or precision requirement would be asking for something no prompt states.
   */
  it("leaves every solution-set and interval answer representation-free", () => {
    const structural = D3_PRACTICE_ITEMS.filter((item) =>
      ["solution_set", "interval"].includes(item.answer.answer_spec.answer_type),
    );
    expect(structural.length).toBeGreaterThan(20);
    for (const item of structural) {
      expect(item.answer.answer_spec.representation, item.item_version_id).toBe("any");
      expect(item.answer.answer_spec.precision, item.item_version_id).toBeNull();
    }
  });
});

/**
 * The three input rules `INTERVAL_PLACEHOLDER` carries, now that a served cohort reaches it.
 *
 * Two of them are AUTHORING constraints rather than input ones, and this is where they are pinned:
 * a union has to be whitespace-delimited to parse at all, and an empty solution set has no
 * interval spelling, so an inequality with no solution has to be asked as a solution set instead.
 * The third (infinity is `inf`, never `oo`) is the learner's to obey and the placeholder's to
 * advertise, and it is covered by the self-validation sweep above.
 */
describe("D3 interval keys obey the three measured interval input rules", () => {
  // A set-builder answer carries `answer_type: "interval"` too, so the two spellings are told
  // apart by `required_notation` and not by the type: that is exactly the dispatch
  // `answerNotation` reads, and mirroring it here is what makes the cohort the right one.
  const intervals = D3_PRACTICE_ITEMS.filter(
    (item) =>
      item.answer.answer_spec.answer_type === "interval" &&
      item.answer.answer_spec.required_notation !== "set_builder",
  );

  it("serves plain interval items, which no pool did before this one", () => {
    expect(
      intervals.length,
      "no interval items at all, so this proves nothing",
    ).toBeGreaterThan(20);
    for (const item of intervals) {
      // `required_notation: "interval"` is what `intervalAnswer` sets and is what routes these to
      // the plain interval comparator; `"set_builder"` is the branch every earlier interval item
      // in the bank took, and is what kept `INTERVAL_PLACEHOLDER` unreached until now.
      expect(item.answer.answer_spec.required_notation, item.item_version_id).toBe(
        "interval",
      );
    }
    // And the other spelling is genuinely served too, so the split above is not vacuous.
    const setBuilder = D3_PRACTICE_ITEMS.filter(
      (item) => item.answer.answer_spec.required_notation === "set_builder",
    );
    expect(
      setBuilder.length,
      "no set-builder items, so the split proves nothing",
    ).toBeGreaterThan(5);
  });

  it("writes every union with whitespace around the join, and spells infinity `inf`", () => {
    const unions = intervals.filter((item) => (item.answer.answer_key ?? "").includes("U"));
    expect(
      unions.length,
      "no union keys, so the delimiter rule is untested",
    ).toBeGreaterThan(5);
    for (const item of unions) {
      const key = item.answer.answer_key ?? "";
      // Either bracket may close the lower ray, so both are allowed before the join; what is
      // pinned is the SPACE either side of it, as HOUSE STYLE and not as a checker rule. The
      // checker accepts the join closed up and with every space stripped, measured correct on
      // all 13 served LIN.4 union items and all 14 LIN.6 ones, so this constrains the authored
      // key to the spelling the placeholder advertises and says nothing about learner input.
      // The `oo` line below is the opposite case: that one the field really does enforce.
      expect(key, item.item_version_id).toMatch(/[)\]] U [[(]/);
      expect(key, item.item_version_id).not.toMatch(/\boo\b/);
    }
  });

  it("never authors an interval key for an empty solution set, which has no spelling", () => {
    for (const item of intervals) {
      const key = item.answer.answer_key ?? "";
      expect(key.trim(), item.item_version_id).not.toBe("{}");
      expect(key.trim().length, item.item_version_id).toBeGreaterThan(4);
    }
  });

  /**
   * The empty set IS a first-class key on LIN.5, where an absolute-value equation with a negative
   * right-hand side has no solution, and it is asked as a `solution_set` for exactly the reason
   * above. Asserted so the deferral of the interval spelling is visibly not a gap in coverage.
   */
  it("asks the no-solution case as a solution set instead, which does have one", () => {
    const empty = D3_PRACTICE_ITEMS.filter((item) => item.answer.answer_key === "{}");
    expect(empty.length, "the no-solution case is never served").toBeGreaterThan(0);
    for (const item of empty) {
      expect(item.answer.answer_spec.answer_type, item.item_version_id).toBe(
        "solution_set",
      );
      expect(item.node_id, item.item_version_id).toBe("LIN.5");
    }
  });
});

/**
 * R30: an answer field's own example must not answer a problem it is SHOWN ON.
 *
 * Graded, not string-compared, which is the whole point: a key of `{4}` is not the string `4` and a
 * bare `4` scores CORRECT against it, so comparing text would miss the leak entirely.
 *
 * Each cohort mirrors `answerNotation`'s own dispatch rather than sweeping the whole pool, and the
 * scoping is load-bearing rather than a convenience. Graded against every D3 item, the
 * solution-set line's `13` "leaks" three LIN.3 items whose key is the number 13, and those items
 * are plain `numeric`: they are never shown that line, so the finding is an artefact of the wrong
 * population. The rule is about a learner reading the field in front of them, and excluding 13
 * from every width and count in the domain to satisfy a field they never see would be superstition.
 *
 * `apps/web/src/lessons/answerFormat.test.ts` is the authoritative sweep, over the served pools and
 * with the same per-notation cohorts; this is the domain-local echo, so a leak fails in the package
 * that authored it rather than only in the app.
 */
describe("no answer field's own example answers a D3 item it is shown on", () => {
  const ADVERTISED: readonly {
    name: string;
    forms: readonly string[];
    shownFor: (item: FrozenItem) => boolean;
    floor: number;
  }[] = [
    {
      // INTERVAL_PLACEHOLDER, read through D3's single copy of it rather than transcribed.
      //
      // This line used to hold one hand-typed union, `(-inf, 2] U (7, inf)`, and it had been
      // stale since the placeholder moved its bound to 5: the floor of 20 went on passing while
      // the string being graded was one no field shows. It also graded ONLY the union, and the
      // two rays are exactly what a learner copies when their own answer is a single ray, which
      // is why `answerFormat.ts` grades all three and why `ADVERTISED_INTERVALS` parses all
      // three out of the text.
      name: "INTERVAL_PLACEHOLDER",
      forms: ADVERTISED_INTERVALS,
      shownFor: (item) =>
        item.answer.answer_spec.answer_type === "interval" &&
        item.answer.answer_spec.required_notation !== "set_builder",
      floor: 20,
    },
    {
      // SOLUTION_SET_PLACEHOLDER: "Every solution: 13 or {-1, 4}"
      name: "SOLUTION_SET_PLACEHOLDER",
      forms: ["13", "{-1, 4}"],
      shownFor: (item) => item.answer.answer_spec.answer_type === "solution_set",
      floor: 20,
    },
    {
      // SET_BUILDER_PLACEHOLDER's own example, and the shape a learner would copy from it.
      name: "SET_BUILDER_PLACEHOLDER",
      forms: ["{x | x != 9}"],
      shownFor: (item) => item.answer.answer_spec.required_notation === "set_builder",
      floor: 5,
    },
  ];

  it.each(ADVERTISED.map((entry) => [entry.name, entry] as const))(
    "%s scores nothing on the D3 items it is shown on",
    (_name, entry) => {
      const shown = D3_PRACTICE_ITEMS.filter(entry.shownFor);
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
      expect(shown.length, `${entry.name} is shown on no D3 item`).toBeGreaterThan(
        entry.floor,
      );
      expect(leaked.join("; ")).toBe("");
    },
    60_000,
  );
});

/**
 * The generators' copy of the placeholder is the placeholder.
 *
 * This is the assertion the drift was missing. `packages/item-bank` cannot import `apps/web` —
 * `@cr/item-bank` declares no such dependency and the arrow runs the other way — so
 * `d3/nodes/_shared.ts` restates the interval field's example text and derives every guarded
 * form from it. A restatement with nothing holding it to the original is exactly what went
 * stale: the bound moved from 2 to 5 in `answerFormat.ts`, the transcribed list here and in
 * `_shared.ts` went on reading 2, and `unadvertisedBound` spent every draw pushing keys off
 * `(-inf, 2]`, which nothing advertises, while leaving the advertised `(-inf, 5]` reachable.
 * Measured before the fix over 4000 draws per interval template: `(-inf, 5]` came up 127 times
 * and `(-inf, 2]` came up 0. So the placeholder is read off disk here and compared, which makes
 * the next move of that example a red test naming the constant to move rather than three
 * templates keying it. D6 reached this shape first (`d6.test.ts`) and named this copy as the
 * same defect still outstanding.
 */
describe("the interval example D3 guards against is the one apps/web prints", () => {
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
   * The parse is load-bearing, so it owes its own floor. A floor rather than a transcription: a
   * parse returning nothing would leave every guard above vacuously satisfied, and that is what
   * this catches, while a moved example still does not have to be typed out again here.
   */
  it("derives the union and both rays from that text", () => {
    expect(ADVERTISED_INTERVALS).toHaveLength(3);
    for (const form of ADVERTISED_INTERVALS) {
      expect(INTERVAL_PLACEHOLDER_TEXT).toContain(form);
    }
    const [union, ...rays] = ADVERTISED_INTERVALS;
    expect(rays).toHaveLength(2);
    for (const ray of rays) {
      expect(union).toContain(ray);
    }
  });

  /**
   * The shifter BITES, asserted against the ray rather than against a number.
   *
   * The sweeps above say no served key is an advertised form, and a generator that had simply
   * stopped drawing near the bound would satisfy them just as well as a working guard. This
   * points `unadvertisedBound` straight at each advertised ray and watches the draw move, so
   * "the sweep is clean" and "the thing keeping it clean still works" are two failures rather
   * than one. The round-trip is the floor under it: it fails if the parse has drifted off the
   * spelling the generators actually produce, which would leave the shift being measured on a
   * string no key ever takes.
   */
  it("shifts a draw off every advertised ray", () => {
    const rays = ADVERTISED_INTERVALS.filter((form) => !form.includes(" U "));
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
        ADVERTISED_INTERVALS,
        `${ray}: the shift landed on another advertised form`,
      ).not.toContain(rayKey(shifted, closed, upward));
    }
  });

  /**
   * The UNION shifter bites too, which is a separate guard from the ray one: LIN.4's two
   * compound-OR shapes correct their LOW bound as a pair, so a working `unadvertisedBound` says
   * nothing about them.
   */
  it("shifts a drawn pair off the advertised union", () => {
    const union = ADVERTISED_INTERVALS.find((form) => form.includes(" U "));
    expect(union, "no union to point the shifter at").toBeDefined();
    const parsed = /^\(-inf, (-?\d+)(\]|\)) U (\[|\()(-?\d+), inf\)$/.exec(union as string);
    expect(parsed, `${union} is not a union this test can read`).not.toBeNull();
    const [, lowText, lowBracket, highBracket, highText] = parsed as RegExpExecArray;
    const low = Number(lowText);
    const lowClosed = lowBracket === "]";
    const high = Number(highText);
    const highClosed = highBracket === "[";
    expect(unionKey(low, lowClosed, high, highClosed), "the parse round-trips").toBe(union);
    const shifted = unadvertisedUnionLow(low, lowClosed, high, highClosed);
    expect(shifted, `${union}: the drawn pair was left on the advertised union`).not.toBe(
      low,
    );
    expect(
      ADVERTISED_INTERVALS,
      `${union}: the shift landed on another advertised form`,
    ).not.toContain(unionKey(shifted, lowClosed, high, highClosed));
  });
});

/**
 * The variety guard. Every D3 template declares a `varietyKey`, and both freezers honour it:
 * content-hash distinctness alone would let two instances that reduce to the same question sit in
 * one cell, which matters here because several shapes reach the same bounded interval from
 * different rules.
 */
describe("D3 variety guard (a cell never holds two instances of the same question)", () => {
  const templateById = new Map(ALL_D3_TEMPLATES.map((t) => [t.template_id, t]));

  function varietyOf(item: FrozenItem): string | undefined {
    return templateById.get(item.template_id)?.varietyKey?.(item.template_params);
  }

  it("declares a varietyKey on every template", () => {
    for (const template of ALL_D3_TEMPLATES) {
      expect(typeof template.varietyKey, template.template_id).toBe("function");
    }
  });

  it("gives every item in a (node, difficulty) cell a distinct variety key", () => {
    const byCell = new Map<string, string[]>();
    for (const item of D3_PRACTICE_POOL) {
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
    for (const item of D3_PRACTICE_VARIANTS) {
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
   * The guard can only be satisfied by a template whose parameter space is big enough: a shorter
   * case list makes `buildVariants` give up after 200 misses and under-deliver without saying so,
   * which is how a cell quietly loses its retry depth.
   */
  it("delivers the full retry depth for every template (no silent shortfall)", () => {
    // Pinned templates are excused HERE and nowhere else, and the exemption is proved to be
    // earned by `describe("the demonstration pin")` below rather than taken on trust. The list is
    // empty, so this sweeps every template.
    const swept = ALL_D3_TEMPLATES.filter(
      (template) => !isDemoPinned(template.template_id),
    );
    // A floor, because "every member of the swept set has full depth" is satisfied for free by an
    // empty set — which is what a list that grew until it swallowed the population would leave.
    // Derived rather than fixed, so it is exact at every list length instead of leaving one
    // template's worth of slack behind after the list empties.
    expect(swept.length, "the pin list has swallowed the sweep").toBe(
      ALL_D3_TEMPLATES.length - DEMO_PINNED_TEMPLATE_IDS.length,
    );
    for (const template of swept) {
      const made = D3_PRACTICE_VARIANTS.filter(
        (item) => item.template_id === template.template_id,
      ).length;
      expect(made, template.template_id).toBe(D3_PRACTICE_RETRY_VARIANTS_PER_CELL);
    }
  });
});

/**
 * **THE DEMONSTRATION PIN, ASSERTED IN BOTH DIRECTIONS SO AN EXEMPTION CANNOT OUTLIVE ITS REASON.**
 *
 * `DEMO_PINNED_TEMPLATE_IDS` excuses a template from the depth and variety guards because its
 * `generate()` deliberately ignores its `rng` (see `demoPinnedTemplates.ts`). An exemption nobody
 * checks is how a real regression ships wearing a temporary label, so both halves are measured:
 *
 *  - a listed template that is no longer degenerate fails, which is what REVERTING a pin does.
 *    That failure is the reminder to empty the list, and it is why the mechanism can be left in
 *    the tree without becoming permanent by neglect;
 *  - an unlisted template that HAS gone degenerate fails, so the precedent this list appears to
 *    set cannot be borrowed silently by the next template that loses its parameter space.
 *
 * THE LIST IS CURRENTLY EMPTY, which makes the first half dormant and the second half a sweep of
 * the whole pool. A loop over an empty list passes while measuring nothing, so the dormancy is
 * asserted rather than left to be inferred from a green run.
 */
describe("the demonstration pin", () => {
  it("is dormant: nothing is pinned", () => {
    // The one line to change when a pin comes back, which is the moment to re-read the contract
    // in `demoPinnedTemplates.ts`. Without this, the loop below is indistinguishable from a
    // live assertion.
    expect(DEMO_PINNED_TEMPLATE_IDS).toHaveLength(0);
  });

  it("names only templates that are still pinned to one instance", () => {
    for (const templateId of DEMO_PINNED_TEMPLATE_IDS) {
      const template = ALL_D3_TEMPLATES.find((entry) => entry.template_id === templateId);
      expect(
        template,
        `${templateId} is excused as a demonstration pin but is not a D3 template`,
      ).toBeDefined();
      if (!template) {
        continue;
      }
      expect(
        drawsOneInstanceOnly(template),
        `${templateId} draws more than one instance again, so the demonstration pin is gone. ` +
          "Take it out of DEMO_PINNED_TEMPLATE_IDS",
      ).toBe(true);
    }
  });

  it("excuses nothing else: every other D3 template still varies with its seed", () => {
    const unpinned = ALL_D3_TEMPLATES.filter(
      (template) => !isDemoPinned(template.template_id),
    );
    // Exact rather than a floor: with the list empty this sweep owes the whole pool, and a floor
    // would go on passing if a pin were added back without its both-ways entry above.
    expect(unpinned.length, "no unpinned templates to sweep").toBe(
      ALL_D3_TEMPLATES.length - DEMO_PINNED_TEMPLATE_IDS.length,
    );
    for (const template of unpinned) {
      expect(
        drawsOneInstanceOnly(template),
        `${template.template_id} now draws one instance whatever its seed, which is a ` +
          "degenerate generator rather than a demonstration pin",
      ).toBe(false);
    }
  });
});

describe("D3 practice set (reshuffle without repeating a shape)", () => {
  const seededRng = () => {
    let seed = 1;
    return () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };
  };

  it("draws a distinct five-slot set in the locked easy-to-hard mix, for every node", () => {
    const rng = seededRng();
    for (const node of D3_PRACTICE_NODES) {
      for (let run = 0; run < 8; run += 1) {
        const set = buildRandomizedD3PracticeSet(node, rng);
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
    for (const node of D3_PRACTICE_NODES) {
      for (let run = 0; run < 30; run += 1) {
        const set = buildRandomizedD3PracticeSet(node, rng);
        for (const { difficulty } of D3_PRACTICE_MIX) {
          const slots = set.filter((item) => item.difficulty === difficulty);
          const shapesAvailable = new Set(
            D3_PRACTICE_ITEMS.filter(
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
      for (const item of buildRandomizedD3PracticeSet("LIN.1", rng)) {
        seen.add(item.item_version_id);
      }
    }
    expect(seen.size).toBeGreaterThan(5);
  });
});

/**
 * L3 IS HARDER THAN ITS OWN L2, per node.
 *
 * `d2.test.ts:257` carries this for EXP.1 and it was written against a real defect: that node's
 * L3 build was its own L2 with a branch removed, so only the input modality separated the two.
 * D3 had no counterpart for any of its five nodes.
 *
 * The shape-depth assertion above is a DIFFERENT claim and does not reach this one. "Holds at
 * least as many distinct shapes at each level as the mix has slots" says a node can fill both L2
 * slots and both L3 slots with distinct template ids — which an L3 authored no harder than the L2
 * beside it satisfies exactly, because being a different shape and being a harder one are not the
 * same property.
 *
 * So each node below names, per L3 shape, the STEP that shape asks for and its own L2 shapes do
 * not, and asserts it in BOTH directions over a sample of draws: every L3 draw has the step, and
 * no draw of either L2 shape on the same node ever does. One direction alone would not be a
 * comparison at all — "every L3 draw states a rule with a divisor over a group" is satisfied just
 * as happily by an L2 that states one too, which is the shape of the defect this is for.
 *
 * LIN.4 is the one node where the difference is not a step one tier has and the other lacks, and
 * the reason is in its `it` at length: its L2 cell holds a two-piece shape on purpose, so the
 * comparison there is the COUNT of moves a draw takes rather than the presence of one, pinned to
 * an exact total on each side.
 *
 * The signals are read off `template_params` and the graded `answer_key` rather than off the
 * prompt's wording wherever a param carries the fact, because a prompt is a string an author can
 * reword and the difficulty lives in the numbers the generator drew.
 */
describe("each D3 node's L3 shapes are harder than its own L2 shapes", () => {
  const SAMPLES = 200;

  /**
   * The shapes each `it` below names, written down once so the list can be checked against the
   * registry instead of being trusted.
   *
   * A hand-written population is how a comparison quietly stops covering a shape: rename an L3
   * template and every claim about it goes on passing, because nothing was asserting that the
   * ids named here are the ids the node ships. So the census below fails BOTH ways — a shape in
   * the registry that no `it` compares fails, and an id named here that the registry no longer
   * holds at that difficulty fails too.
   */
  const COMPARED: readonly {
    node: string;
    l2: readonly string[];
    l3: readonly string[];
  }[] = [
    {
      node: "LIN.1",
      l2: ["d3.lin1.balance-word.l2", "d3.lin1.both-sides.l2"],
      l3: ["d3.lin1.distribute.l3", "d3.lin1.negative-coefficient.l3"],
    },
    {
      node: "LIN.3",
      l2: ["d3.lin3.melt-tin.l2", "d3.lin3.duty-count.l2"],
      l3: ["d3.lin3.mould-face.l3", "d3.lin3.assay-edge.l3"],
    },
    {
      node: "LIN.4",
      l2: [
        "d3.lin4.two-step.l2",
        "d3.lin4.negative-coefficient.l2",
        "d3.lin4.compound-or.l2",
      ],
      l3: ["d3.lin4.compound-and.l3", "d3.lin4.compound-or.l3"],
    },
    {
      node: "LIN.5",
      l2: ["d3.lin5.coefficient.l2", "d3.lin5.isolate.l2"],
      l3: ["d3.lin5.degenerate.l3", "d3.lin5.scaled.l3"],
    },
    {
      node: "LIN.6",
      l2: ["d3.lin6.union.l2", "d3.lin6.scaled-band.l2"],
      l3: ["d3.lin6.scaled-union.l3", "d3.lin6.set-builder.l3"],
    },
  ];

  /** The L2 shapes of the node an L3 shape belongs to, so no `it` names them twice. */
  function l2SiblingsOf(l3Id: string): readonly string[] {
    const row = COMPARED.find((entry) => entry.l3.includes(l3Id));
    if (!row) {
      throw new Error(`${l3Id} is not a compared L3 shape`);
    }
    return row.l2;
  }

  const cache = new Map<string, FrozenItem[]>();

  /** `SAMPLES` draws of one template, deterministic and memoised across the block. */
  function draws(templateId: string): FrozenItem[] {
    const held = cache.get(templateId);
    if (held) {
      return held;
    }
    const template = ALL_D3_TEMPLATES.find((t) => t.template_id === templateId);
    if (!template) {
      throw new Error(`${templateId} is not a D3 template`);
    }
    const items = Array.from({ length: SAMPLES }, (_unused, index) =>
      generateFromTemplate(template, "practice", 770_000 + index),
    );
    cache.set(templateId, items);
    return items;
  }

  /** Every draw of several templates at once, for the "and no L2 ever does" half. */
  function drawsOfAll(templateIds: readonly string[]): FrozenItem[] {
    return templateIds.flatMap((id) => draws(id));
  }

  const param = (item: FrozenItem, name: string): number => {
    const value = item.template_params[name];
    if (typeof value !== "number") {
      throw new Error(`${item.item_version_id} has no numeric ${name}`);
    }
    return value;
  };

  const keyOf = (item: FrozenItem): string => String(item.answer.answer_key ?? "");

  /**
   * How many FINITE bounds an interval key names, which is what tells a ray from a band.
   *
   * `inf` carries no digits, so the numeral scan counts exactly the finite ends: `(-inf, 3]` is
   * one, `[-2, 6]` and `(-inf, 3) U (8, inf)` are two.
   */
  const finiteBounds = (key: string): number => (key.match(/-?\d+/g) ?? []).length;

  /**
   * The comparison's own population, both ways round, so nothing below is a claim over nothing
   * and no shape can leave the comparison by being renamed.
   */
  it("compares every L2 and L3 shape on every node, over a real sample of each", () => {
    expect(
      [...D3_PRACTICE_NODES].sort(),
      "the compared nodes are not the nodes the domain ships",
    ).toEqual(COMPARED.map((entry) => entry.node).sort());

    for (const { node, l2, l3 } of COMPARED) {
      for (const [difficulty, named] of [
        [2, l2],
        [3, l3],
      ] as const) {
        const registered = ALL_D3_TEMPLATES.filter(
          (t) => t.node_id === node && t.difficulty === difficulty,
        ).map((t) => t.template_id);
        // Set equality, so a shape the registry gained is compared and a name that has gone
        // fails here rather than going on being asserted about a template nobody serves.
        expect([...registered].sort(), `${node} L${difficulty}`).toEqual([...named].sort());
      }
    }

    // And a floor under the sampling itself: `it.each` over an empty draw list emits nothing,
    // and a loop over one passes on anything.
    const everyCompared = COMPARED.flatMap((entry) => [...entry.l2, ...entry.l3]);
    expect(everyCompared.length, "nothing is being compared").toBeGreaterThanOrEqual(20);
    for (const id of everyCompared) {
      expect(draws(id).length, id).toBe(SAMPLES);
    }
  }, 60_000);

  /**
   * LIN.1. L3a puts the variable inside a BRACKET, which has to be multiplied out before
   * anything on that side can be collected; L3b makes the coefficient NEGATIVE, so the last
   * division is by a negative and the sign of the answer turns on it. Neither L2 shape does
   * either: `balance-word` divides by a count and `both-sides` by a gathered coefficient, and
   * both of those are positive by construction.
   */
  it("LIN.1: a bracket to multiply out, and a division by a negative", () => {
    for (const item of draws("d3.lin1.distribute.l3")) {
      // The bracket is real rather than decorative: a coefficient of 1 would leave nothing to
      // distribute, and the inner term has to be non-zero or the bracket collapses to `x`.
      expect(param(item, "a"), item.prompt).toBeGreaterThanOrEqual(2);
      expect(param(item, "inner"), item.prompt).not.toBe(0);
      expect(item.prompt, item.item_version_id).toMatch(/\d\(x [-+] \d+\)/);
    }
    for (const item of draws("d3.lin1.negative-coefficient.l3")) {
      // The equation is `b - ax = c`, so the coefficient the last division is by is `-a`.
      expect(-param(item, "a"), item.prompt).toBeLessThanOrEqual(-2);
    }
    for (const item of drawsOfAll(l2SiblingsOf("d3.lin1.distribute.l3"))) {
      expect(item.prompt, item.item_version_id).not.toMatch(/\(x [-+]/);
      const divisor = item.template_params.count ?? item.template_params.gathered;
      expect(divisor, item.item_version_id).toBeGreaterThan(0);
    }
  }, 60_000);

  /**
   * LIN.3. Both L3 shapes state a rule in which the target sits inside a GROUP that is itself
   * under a divisor, so the wrappings have to come off outermost first and the rearrangement is
   * three moves rather than two. Neither L2 rule has a divisor or a group at all: `B = c + t - m`
   * and `C = np + f` are both flat.
   */
  it("LIN.3: a divisor wrapping a group, so the peeling has an order", () => {
    for (const item of drawsOfAll(["d3.lin3.mould-face.l3", "d3.lin3.assay-edge.l3"])) {
      expect(item.prompt, item.item_version_id).toContain("\\dfrac");
      // The group holding the target, with the two names inside it either summed or differenced.
      expect(item.prompt, item.item_version_id).toMatch(/\([a-z] [-+] [a-z]\)/);
    }
    for (const item of drawsOfAll(l2SiblingsOf("d3.lin3.mould-face.l3"))) {
      expect(item.prompt, item.item_version_id).not.toContain("\\dfrac");
      expect(item.prompt, item.item_version_id).not.toMatch(/\([a-z] [-+] [a-z]\)/);
    }
  }, 60_000);

  /**
   * How many separate conditions a draw states, read off the bounds its generator recorded.
   *
   * A shape solving one inequality records the single `bound` its ray runs from; a shape stating
   * two records a `low` and a `high`. That is the generator's own bookkeeping rather than a guess
   * about the prompt, and it is asserted non-vacuous below by the exact totals: a shape recording
   * its bounds under some third name would read as two conditions and fail there rather than
   * passing quietly.
   */
  const conditionsStated = (item: FrozenItem): number =>
    item.template_params.bound === undefined ? 2 : 1;

  /**
   * Moves to isolate the variable within ONE condition: a coefficient other than $1$ costs a
   * division, and a constant beside the variable term costs an undoing.
   */
  const movesPerCondition = (item: FrozenItem): number =>
    (Math.abs(item.template_params.a ?? 1) === 1 ? 0 : 1) +
    ((item.template_params.b ?? 0) === 0 ? 0 : 1);

  const movesToSolve = (item: FrozenItem): number =>
    conditionsStated(item) * movesPerCondition(item);

  /**
   * LIN.4, restated on the WORK rather than on the SHAPE of the answer.
   *
   * The earlier form of this compared shapes: both L2 shapes answered with a ray naming one finite
   * bound and both L3 shapes with two, so an L3 that quietly went back to a ray failed. That
   * stopped being the difference between the tiers when `d3.lin4.compound-or.l2` landed, whose
   * whole reason for existing is to serve the two-piece answer at the tier the check re-asks from.
   * A union L2 has two finite bounds and a ` U `, so the old L2 line would have failed on a shape
   * that is doing exactly what it was authored to do.
   *
   * Deleting that line would have left the hardness claim asserted in one direction only, which is
   * the shape of the defect this whole block is for. So the comparison is restated as MOVES: both
   * L3 shapes state two conditions and each condition takes two moves, a constant to undo and a
   * coefficient to divide out, which is four. No L2 draw on the node exceeds two: `two-step` and
   * `negative-coefficient` state one condition of two moves, and `compound-or.l2` states two
   * conditions of one move each. Both cohorts are pinned to an exact total, so a tier drifting
   * either way fails and neither claim can be satisfied by a shape that reads as no work at all.
   *
   * The shape claim survives per cohort rather than per tier: an L3 still owes two finite bounds,
   * and every L2 draw owes a key whose finite bounds match the number of conditions it stated, so
   * a ray shape that became a union and a union shape that became a ray both still fail.
   */
  it("LIN.4: four moves at L3 against two at L2, and a key that matches the conditions", () => {
    for (const item of draws("d3.lin4.compound-and.l3")) {
      const key = keyOf(item);
      expect(finiteBounds(key), item.item_version_id).toBe(2);
      expect(key, item.item_version_id).not.toContain("inf");
      expect(param(item, "high") - param(item, "low"), item.prompt).toBeGreaterThan(0);
    }
    for (const item of draws("d3.lin4.compound-or.l3")) {
      const key = keyOf(item);
      expect(finiteBounds(key), item.item_version_id).toBe(2);
      expect(key, item.item_version_id).toContain(" U ");
    }
    // Two conditions of two moves each on every L3 draw.
    for (const item of drawsOfAll(["d3.lin4.compound-and.l3", "d3.lin4.compound-or.l3"])) {
      expect(conditionsStated(item), item.item_version_id).toBe(2);
      expect(movesPerCondition(item), item.item_version_id).toBe(2);
      expect(movesToSolve(item), item.prompt).toBe(4);
    }
    // And no more than two moves in total on any L2 draw, however they are distributed.
    for (const item of drawsOfAll(l2SiblingsOf("d3.lin4.compound-and.l3"))) {
      expect(movesToSolve(item), item.prompt).toBe(2);
      const key = keyOf(item);
      expect(finiteBounds(key), item.item_version_id).toBe(conditionsStated(item));
      expect(key.includes(" U "), item.item_version_id).toBe(conditionsStated(item) === 2);
    }
    // Both L2 distributions are genuinely drawn, so "at most two moves" is a statement about a
    // cell holding a one-condition shape AND a two-condition one rather than about three rays.
    const lin4L2 = drawsOfAll(l2SiblingsOf("d3.lin4.compound-and.l3"));
    expect(
      lin4L2.filter((item) => conditionsStated(item) === 1).length,
      "no L2 draw states a single condition",
    ).toBeGreaterThan(20);
    expect(
      lin4L2.filter((item) => conditionsStated(item) === 2).length,
      "no L2 draw states two conditions, so the tier never serves the two-piece answer the check re-asks",
    ).toBeGreaterThan(20);
  }, 60_000);

  /**
   * LIN.5. L3a is where "an absolute-value equation has two answers" stops being true: a zero or
   * a negative right-hand side leaves one solution or none, and BOTH cases have to be reachable
   * or the shape is only half of what it claims. L3b keeps the pair but makes the isolating step
   * a DIVISION, by a multiplier standing outside the bars. Both L2 shapes always deliver a
   * two-element set and neither has anything multiplying the bars.
   */
  it("LIN.5: a right-hand side that breaks the pair, and an isolation that divides", () => {
    const degenerate = draws("d3.lin5.degenerate.l3");
    for (const item of degenerate) {
      const size = keyOf(item) === "{}" ? 0 : keyOf(item).split(",").length;
      expect(size, `${item.item_version_id} (${keyOf(item)})`).toBeLessThan(2);
    }
    // Both degenerate cases, so the shape is not one of them wearing the other's tier.
    expect(
      degenerate.filter((item) => keyOf(item) === "{}").length,
      "the negative right-hand side is never drawn",
    ).toBeGreaterThan(20);
    expect(
      degenerate.filter((item) => keyOf(item) !== "{}").length,
      "the zero right-hand side is never drawn",
    ).toBeGreaterThan(20);

    for (const item of draws("d3.lin5.scaled.l3")) {
      expect(param(item, "scale"), item.prompt).toBeGreaterThanOrEqual(2);
      expect(item.prompt, item.item_version_id).toMatch(/\$\d+\\lvert/);
    }
    for (const item of drawsOfAll(l2SiblingsOf("d3.lin5.degenerate.l3"))) {
      expect(keyOf(item).split(",").length, item.item_version_id).toBe(2);
      expect(item.prompt, item.item_version_id).not.toMatch(/\$\d+\\lvert/);
    }
  }, 60_000);

  /**
   * LIN.6. L3a is the CONJUNCTION of the two things its own L2 shapes carry one each of: the
   * away-from direction, which gives a union, and a coefficient inside the bars, which makes each
   * branch a two-step inequality. `union.l2` has the direction with a bare `x` inside the bars;
   * `scaled-band.l2` has the coefficient on a single band. So the claim is that no L2 draw has
   * both, which is the property an L3 built by copying either one of them would fail.
   *
   * L3b is graded on the NOTATION rather than on the set, which no L2 shape on the node asks for,
   * and it draws both directions of sign so the discrimination is still being tested.
   */
  it("LIN.6: both hard features at once, and a notation no L2 is graded on", () => {
    for (const item of draws("d3.lin6.scaled-union.l3")) {
      expect(param(item, "a"), item.prompt).toBeGreaterThanOrEqual(2);
      expect(keyOf(item), item.item_version_id).toContain(" U ");
    }
    const lin6L2 = drawsOfAll(l2SiblingsOf("d3.lin6.scaled-union.l3"));
    for (const item of lin6L2) {
      const coefficient = item.template_params.a ?? 1;
      const union = keyOf(item).includes(" U ");
      expect(
        coefficient >= 2 && union,
        `${item.item_version_id} carries both of L3a's features`,
      ).toBe(false);
    }
    // And each L2 shape genuinely carries ONE of them, so "no L2 has both" is a statement about
    // a conjunction rather than about two shapes that happen to have neither.
    expect(
      lin6L2.filter((item) => keyOf(item).includes(" U ")).length,
      "no L2 draw is a union, so the direction is not what L3a adds",
    ).toBeGreaterThan(20);
    expect(
      lin6L2.filter((item) => (item.template_params.a ?? 1) >= 2).length,
      "no L2 draw has a coefficient inside the bars, so that is not what L3a adds either",
    ).toBeGreaterThan(20);

    const setBuilder = draws("d3.lin6.set-builder.l3");
    for (const item of setBuilder) {
      expect(item.answer.answer_spec.required_notation, item.item_version_id).toBe(
        "set_builder",
      );
    }
    // Both directions, so the shape the notation has to be written in still varies.
    expect(
      setBuilder.filter((item) => param(item, "away") === 1).length,
      "the away-from direction is never drawn",
    ).toBeGreaterThan(20);
    expect(
      setBuilder.filter((item) => param(item, "away") === 0).length,
      "the at-most direction is never drawn",
    ).toBeGreaterThan(20);
    for (const item of lin6L2) {
      expect(item.answer.answer_spec.required_notation, item.item_version_id).not.toBe(
        "set_builder",
      );
    }
  }, 60_000);
}, 60_000);

describe("D3 pool isolation (never touches the frozen LIN.1 assessment or any other pool)", () => {
  it("shares no id or content with any other authored pool", () => {
    const others = [
      ...D1_ITEM_PACK,
      ...D1_PRACTICE_ITEMS,
      ...D1_WALK_ITEM_PACK,
      ...D2_PRACTICE_ITEMS,
      ...D5_PRACTICE_ITEMS,
      ...D7_PRACTICE_ITEMS,
      ...D8_PRACTICE_ITEMS,
      ...PRODUCT_ITEM_PACK,
      ...INTERACTIVE_PRACTICE_ITEMS,
    ];
    const otherIds = new Set(others.map((item) => item.item_version_id));
    const otherHashes = new Set(others.map(hashItemDefinition));
    for (const item of D3_PRACTICE_ITEMS) {
      expect(otherIds.has(item.item_version_id), item.item_version_id).toBe(false);
      expect(otherHashes.has(hashItemDefinition(item)), item.item_version_id).toBe(false);
    }
  });

  it("shares no template id with the frozen LIN.1 product assessment", () => {
    const productTemplateIds = new Set(PRODUCT_ITEM_PACK.map((item) => item.template_id));
    expect(productTemplateIds.has("prod.lin-1.l2"), "the frozen LIN.1 item is here").toBe(
      true,
    );
    for (const template of ALL_D3_TEMPLATES) {
      expect(productTemplateIds.has(template.template_id), template.template_id).toBe(
        false,
      );
    }
  });
});

/**
 * R13, the half that lives in the PROMPT rather than in the hints.
 *
 * A hint that branches on the answer leaks through the correspondence and not through either
 * wording, and the same is true one surface up. `d3.lin5.degenerate.l3` shipped two prompts:
 * the draws answering `{}` closed on "and write $\{\}$ if there is no solution" and the draws
 * answering `{root}` did not, so the clause and the answer stood in exact 1:1 correspondence
 * over 400 draws (206 empty, all clause; 194 single-root, none). Each sentence reads innocently
 * on its own. Together they let a learner settle the answer off the sentence without reading the
 * right-hand side, which is the whole of what L3a measures.
 *
 * `validateTemplates` cannot see this: `hint_leaks_answer` reads hints, and a prompt is allowed
 * to say anything. So the property is asserted here, and it is asserted as the STRONGER one that
 * implies it: a template's prompt wording does not vary across its draws at all. Wording means
 * the sentence with every `$...$` span removed, so numbers are free to move and words are not.
 *
 * The population is every D3 template, derived from the registry rather than listed, with a
 * floor under it so an emptied registry cannot pass this vacuously.
 */
describe("no D3 prompt's WORDING branches on the draw", () => {
  const DRAWS = 400;

  /** The prompt with every math span replaced, leaving the sentence an author wrote. */
  function wording(prompt: string): string {
    return prompt.replace(/\$[^$]*\$/g, "$M$");
  }

  /**
   * Templates whose prompt legitimately reworded itself, each with the reason.
   *
   * Empty, and the emptiness is the claim. A template drawing two different STORIES would
   * belong here; a template rewording itself around its own answer never does. Asserted both
   * ways below, so an entry that stops qualifying fails and a listed template that stops
   * rewording fails too.
   */
  const WORDING_VARIES_BY_DESIGN: readonly { template: string; why: string }[] = [];

  it("renders one wording per template, over every D3 shape", () => {
    expect(ALL_D3_TEMPLATES.length, "no D3 templates to sweep").toBeGreaterThanOrEqual(25);
    const varied: string[] = [];
    for (const template of ALL_D3_TEMPLATES) {
      const wordings = new Set(
        Array.from({ length: DRAWS }, (_unused, index) =>
          wording(generateFromTemplate(template, "practice", 500_000 + index).prompt),
        ),
      );
      if (wordings.size > 1) {
        varied.push(
          `${template.template_id} renders ${wordings.size} wordings over ${DRAWS} draws:\n    ${[...wordings].join("\n    ")}`,
        );
      }
    }
    expect(varied.join("\n  "), "a D3 prompt reworded itself between draws").toBe("");
  });

  /**
   * The correspondence itself, measured on the shape that had it, because "one wording" is a
   * proxy and this is the property. The answer is re-derived from the RENDERED prompt's own
   * right-hand side rather than from `template_params` or from `answer_key`: reading the params
   * would agree with the key by construction and pass over a prompt that had stopped asking for
   * its own answer.
   */
  it("never lets the empty-set instruction tell a LIN.5 learner which draw they have", () => {
    const template = ALL_D3_TEMPLATES.find(
      (entry) => entry.template_id === "d3.lin5.degenerate.l3",
    );
    if (!template) {
      throw new Error("d3.lin5.degenerate.l3 is not registered");
    }
    const clause = "if there is no solution";
    const tally = { emptyWith: 0, emptyWithout: 0, rootWith: 0, rootWithout: 0 };
    for (let index = 0; index < DRAWS; index += 1) {
      const item = generateFromTemplate(template, "practice", 500_000 + index);
      const rightHandSide = /\\rvert = (-?\d+)\$/.exec(item.prompt);
      if (!rightHandSide) {
        throw new Error(`no right-hand side in the rendered prompt: ${item.prompt}`);
      }
      // A distance is never negative, so a negative right-hand side is the empty draw. Read
      // off the prompt the learner sees, which is the only place the leak could be.
      const empty = Number(rightHandSide[1]) < 0;
      const carries = item.prompt.includes(clause);
      if (empty) {
        tally[carries ? "emptyWith" : "emptyWithout"] += 1;
      } else {
        tally[carries ? "rootWith" : "rootWithout"] += 1;
      }
    }
    // Both branches drawn, so neither side of the correspondence is being asserted over nothing.
    expect(tally.emptyWith + tally.emptyWithout, "no empty draws").toBeGreaterThan(50);
    expect(tally.rootWith + tally.rootWithout, "no single-root draws").toBeGreaterThan(50);
    const rate = `empty draws carrying the clause ${tally.emptyWith} of ${tally.emptyWith + tally.emptyWithout}, single-root draws carrying it ${tally.rootWith} of ${tally.rootWith + tally.rootWithout}`;
    // The clause is either on every draw or on none. Anything between is the correspondence.
    expect(tally.emptyWithout === 0 && tally.rootWithout === 0, rate).toBe(
      tally.emptyWith > 0,
    );
  });

  it("names only templates that still reword themselves", () => {
    for (const { template } of WORDING_VARIES_BY_DESIGN) {
      const entry = ALL_D3_TEMPLATES.find((item) => item.template_id === template);
      expect(entry, `${template} is excused but is no longer a D3 template`).toBeDefined();
      if (!entry) {
        continue;
      }
      const wordings = new Set(
        Array.from({ length: DRAWS }, (_unused, index) =>
          wording(generateFromTemplate(entry, "practice", 500_000 + index).prompt),
        ),
      );
      expect(
        wordings.size,
        `${template} is excused as rewording itself by design, but renders one wording, so the entry excuses nothing`,
      ).toBeGreaterThan(1);
    }
    expect(WORDING_VARIES_BY_DESIGN).toEqual([]);
  });
}, 120_000);

/**
 * A move's DIRECTION is only sayable when the generator fixed it.
 *
 * `d3.lin1.two-step.l1` drew its constant `rng.int(-9, 9) || 4` and told every learner that a
 * plain number "was added on", then to "take that plain number off BOTH sides". Measured off the
 * rendered prompts, 196 of 400 draws and 4 of the 7 served instances print a SUBTRACTED constant,
 * where the move that works is an addition, and the item's own worked solution performs that
 * addition three lines below the hint that forbade it. R13's constancy rule is what allowed it:
 * one hints array is rendered for every draw, so a sentence naming one direction is false on
 * every draw that took the other.
 *
 * ## The population, and why it is not the wording
 *
 * A template is in scope when its rendered prompts print a constant on the variable's own side
 * with BOTH signs, which is a fact about the generator and is read off the prompts. That is the
 * behaviour: any surface of such a template that commits to one direction is false half the time.
 *
 * What is scoped by wording is the DETECTOR, and this is the guard's known narrowness. A sentence
 * is only read when it names the constant by one of `CONSTANT_NAMES`, because "the move whose
 * direction this sentence is about" cannot be recovered from English. A template naming it some
 * third way is invisible here, so the list is asserted non-vacuous below: it has to go on
 * matching a floor of sentences across the population, which is what stops it quietly matching
 * nothing after a rewrite.
 */
describe("no D3 hint or worked step names a direction the draw can contradict", () => {
  const DRAWS = 200;

  /** How the D3 templates name the plain constant beside the variable term. */
  const CONSTANT_NAMES: readonly string[] = ["plain number", "plain numbers"];

  /** Undoing it by subtracting. */
  const TAKES_IT_OFF = /\b(off|subtract|subtracts|subtracted|subtracting)\b/i;
  /** Undoing it by adding, or describing it as having been added. */
  const PUTS_IT_ON = /\b(add|adds|added|adding)\b/i;

  function sentences(text: string): string[] {
    return text.split(/(?<=[.:!?])\s+/).filter((part) => part.trim().length > 0);
  }

  /**
   * Templates whose prompt prints that constant with either sign, derived from the draws.
   *
   * The match is a constant standing beside the variable term, which is the one the undoing
   * move acts on: a negative right-hand side or a negative bound is not it.
   */
  const VARYING_SIGN = ALL_D3_TEMPLATES.filter((template) => {
    const signs = new Set<string>();
    for (let index = 0; index < DRAWS; index += 1) {
      const { prompt } = generateFromTemplate(template, "practice", 500_000 + index);
      for (const match of prompt.matchAll(/\d*x ([+-]) \d/g)) {
        signs.add(match[1] ?? "");
      }
    }
    return signs.size > 1;
  });

  it("has a population and a detector that both still reach something", () => {
    expect(
      VARYING_SIGN.length,
      "no D3 template prints a constant beside the variable with either sign",
    ).toBeGreaterThanOrEqual(8);
    const named = VARYING_SIGN.flatMap((template) => {
      const item = generateFromTemplate(template, "practice", 500_000);
      return [...item.hints, ...item.worked_solution].filter((line) =>
        CONSTANT_NAMES.some((name) => line.toLowerCase().includes(name)),
      );
    });
    // Without this the sweep below passes by matching no sentences at all, which is exactly what
    // a rewrite that renamed the constant would produce.
    expect(
      named.length,
      `CONSTANT_NAMES matched no sentence in the population, so the sweep reads nothing`,
    ).toBeGreaterThanOrEqual(6);
  });

  it.each(VARYING_SIGN.map((template) => template.template_id))(
    "%s never tells the learner which way the constant went",
    (templateId) => {
      const template = VARYING_SIGN.find((entry) => entry.template_id === templateId);
      if (!template) {
        throw new Error(`${templateId} left the population mid-run`);
      }
      const offending: string[] = [];
      const seen = new Set<string>();
      for (let index = 0; index < DRAWS; index += 1) {
        const item = generateFromTemplate(template, "practice", 500_000 + index);
        for (const line of [...item.hints, ...item.worked_solution]) {
          for (const sentence of sentences(line)) {
            const lower = sentence.toLowerCase();
            if (!CONSTANT_NAMES.some((name) => lower.includes(name))) {
              continue;
            }
            const takesOff = TAKES_IT_OFF.test(sentence);
            const putsOn = PUTS_IT_ON.test(sentence);
            // Reported with the numbers removed, so one wording is one line however many
            // draws rendered it.
            const wording = sentence.replace(/\$[^$]*\$/g, "$M$");
            if (takesOff !== putsOn && !seen.has(wording)) {
              seen.add(wording);
              offending.push(
                `names only "${takesOff ? "take it off" : "it was added"}": ${wording}`,
              );
            }
          }
        }
      }
      expect(
        offending.join("\n    "),
        `${templateId} prints that constant with either sign, so a sentence naming one direction is false on the other half of its draws`,
      ).toBe("");
    },
  );
}, 120_000);

describe("D3 pool content pin (a template edit that changes the pool must be explicit)", () => {
  it("pins the frozen D3 practice pool ids + content hashes", () => {
    const snapshot = D3_PRACTICE_POOL.map((item) => ({
      id: item.item_version_id,
      node: item.node_id,
      difficulty: item.difficulty,
      hash: hashItemDefinition(item),
    }));
    expect(snapshot).toMatchSnapshot();
  });
});
