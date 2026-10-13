import { PRODUCT_CHECKER_VERSION } from "@cr/components";
import { getNodeOrThrow, getNodesByScope } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { D1_ITEM_PACK, D1_PRACTICE_ITEMS, D1_WALK_ITEM_PACK } from "./d1";
import { D2_PRACTICE_ITEMS } from "./d2/practice";
import { D3_PRACTICE_ITEMS } from "./d3/practice";
import { D4_PRACTICE_ITEMS } from "./d4/practice";
import { D5_PRACTICE_ITEMS } from "./d5/practice";
import { D6_PRACTICE_ITEMS } from "./d6/practice";
import { D7_PRACTICE_ITEMS } from "./d7/practice";
import { D8_PRACTICE_ITEMS } from "./d8/practice";
import { D9_PRACTICE_ITEMS } from "./d9/practice";
import { D10_PRACTICE_ITEMS } from "./d10/practice";
import { DIAGNOSTIC_WALK_ITEMS_PER_FORM } from "./diagnostic-scope";
import { INTERACTIVE_PRACTICE_ITEMS } from "./interactive/practice";
import {
  EXHAUSTED_TEMPLATE_NODES,
  PRACTICE_WALK_CANDIDATES,
  PRACTICE_WALK_FORM_A,
  PRACTICE_WALK_FORM_B,
  PRACTICE_WALK_ITEM_PACK,
  PRACTICE_WALK_NODES,
  PRACTICE_WALK_TEMPLATES,
  PRACTICE_WALK_TIER,
  templateBudget,
} from "./practice-walk";
import { PRODUCT_ITEM_PACK } from "./product";
import { hashItemDefinition } from "./schema";
import { freezeDeepParallelForms, generateFromTemplate } from "./template";
import { PRODUCT_CHECKER_CONFIG, validateItemBank, validateWalkPool } from "./validate";

/**
 * **THE WALK FORMS FROZEN FROM THE LESSON-PRACTICE TEMPLATES, HELD TO BEING SERVABLE.**
 *
 * `practice-walk.ts` turns 36 nodes' lesson-practice templates into walk forms with nobody
 * authoring a question. That is only sound if three things hold, and none of them is the kind
 * of thing to take on trust:
 *
 *  1. every frozen key still grades CORRECT through the checker the walk composes;
 *  2. no cell repeats an item, within a form or across the two;
 *  3. no item shares content with anything already frozen — a walk item that duplicates a
 *     practice item is a learner meeting their diagnostic question again in the lesson.
 *
 * The interesting one is (2), because the freezer does not guarantee it. `freezeDeepParallelForms`
 * bumps a colliding seed up to 500 times and then ACCEPTS the collision, and these templates'
 * parameter spaces are small enough for that to happen: measured on the first run of this
 * module, `TRG.2`, `TRG.6`, `TRG.8` and `TRG.9` each emitted one item into both forms. So the
 * budget ledger below is load-bearing rather than documentary, and it is asserted both ways.
 */

const D1_IDS = new Set(getNodesByScope("mvp").map((node) => node.id));

/** Every frozen item that existed before this pack — the set it may not collide with. */
const PRE_EXISTING = [
  ...D1_ITEM_PACK,
  ...D1_WALK_ITEM_PACK,
  ...PRODUCT_ITEM_PACK,
  ...D1_PRACTICE_ITEMS,
  ...D2_PRACTICE_ITEMS,
  ...D3_PRACTICE_ITEMS,
  ...D4_PRACTICE_ITEMS,
  ...D5_PRACTICE_ITEMS,
  ...D6_PRACTICE_ITEMS,
  ...D7_PRACTICE_ITEMS,
  ...D8_PRACTICE_ITEMS,
  ...D9_PRACTICE_ITEMS,
  ...D10_PRACTICE_ITEMS,
  ...INTERACTIVE_PRACTICE_ITEMS,
];

/**
 * How many seeds the ledger check searches per template. The spaces are small — the narrowest
 * candidate draws three distinct items in total — so for anything that could be short this is
 * an exhaustive count rather than a sample, which is what lets the assertion be an equality
 * about the budget rather than a bound on it.
 */
const PROBE_SEEDS = 4000;

/** Fresh distinct contents a template can still draw, measured rather than read off the list. */
function measuredBudget(templateId: string): number {
  const template = PRACTICE_WALK_CANDIDATES.find((t) => t.template_id === templateId);
  if (!template) {
    throw new Error(`${templateId} is not a candidate template`);
  }
  const taken = new Set(PRE_EXISTING.map(hashItemDefinition));
  const fresh = new Set<string>();
  for (let seed = 0; seed < PROBE_SEEDS; seed += 1) {
    const hash = hashItemDefinition(generateFromTemplate(template, "A", 3_000_000 + seed));
    if (!taken.has(hash)) {
      fresh.add(hash);
    }
  }
  return fresh.size;
}

describe("the practice-derived walk pack", () => {
  it("froze a real pack, over a real population", () => {
    // The #193 floor. Every claim below is a loop, and a loop over nothing is green.
    expect(PRACTICE_WALK_CANDIDATES.length).toBeGreaterThanOrEqual(70);
    expect(PRACTICE_WALK_NODES.length).toBeGreaterThanOrEqual(30);
    expect(PRACTICE_WALK_ITEM_PACK.length).toBeGreaterThanOrEqual(200);
    expect(PRACTICE_WALK_FORM_A.length).toBe(PRACTICE_WALK_FORM_B.length);
    // Composition as well as size, because a floor of 30 nodes is met by 30 of anything and
    // what this pack claims is that it reaches the domains the instrument could not.
    const domains = new Set(
      PRACTICE_WALK_NODES.map((nodeId) => getNodeOrThrow(nodeId).domain),
    );
    expect(domains.size, `only ${[...domains].join(",")}`).toBeGreaterThanOrEqual(6);
    expect(domains, "D10 geometry is the gap this work exists to close").toContain("D10");
  });

  it("touches no D1 node, so the D1 path cannot have moved", () => {
    // The strongest form of "D1 is unchanged" is that this pack never mentions it. The
    // hash-level assertion over the merged pool lives in `diagnostic-scope.test.ts`.
    for (const nodeId of PRACTICE_WALK_NODES) {
      expect(D1_IDS, `${nodeId} is a D1 node and must not be re-frozen here`).not.toContain(
        nodeId,
      );
    }
    expect(D1_IDS.size).toBe(6);
  });

  it("freezes the routing tier only", () => {
    for (const item of PRACTICE_WALK_ITEM_PACK) {
      expect(item.difficulty, `${item.item_version_id} is not L${PRACTICE_WALK_TIER}`).toBe(
        PRACTICE_WALK_TIER,
      );
    }
    // And it is an ASSESSMENT pack: a `practice`-form item here would be served by nothing
    // and would collide with the pool it came from.
    for (const item of PRACTICE_WALK_ITEM_PACK) {
      expect(["A", "B"]).toContain(item.form);
      expect(item.hints, `${item.item_version_id} carries practice hints`).toEqual([]);
      expect(item.worked_solution).toEqual([]);
    }
  });

  it("grades every item correct through the checker the walk composes", () => {
    expect(PRODUCT_CHECKER_CONFIG.checkerVersion).toBe(PRODUCT_CHECKER_VERSION);
    expect(
      validateWalkPool(
        PRACTICE_WALK_ITEM_PACK,
        {
          nodes: PRACTICE_WALK_NODES,
          minItemsPerCell: DIAGNOSTIC_WALK_ITEMS_PER_FORM,
        },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  });

  // `validateItemBank` re-grades every item in the bank through the v2 checker, and structural
  // and solution-set compares cost far more per item than a numeric one, so this needs more than
  // vitest's 5s default — the same budget `d4.test.ts`, `d8.test.ts` and `product.test.ts` take
  // for the same reason. It first went over the default when D4's Early Modern pool added 70
  // items, and a TIMEOUT here is worse than a slow test: the assertion never runs, so the
  // collision claim reports nothing rather than reporting green.
  it("collides with nothing already frozen, in either direction", () => {
    // THE CLAIM ITSELF, stated directly and cheaply, so it runs on every shard of every run.
    // `hashItemDefinition` reads `node_id`, `prompt` and `answer` and NOT the form, so an
    // assessment item frozen from the same template at the same params as a practice item
    // hashes identically to it — live, a learner meeting their diagnostic question again in the
    // lesson it sent them to.
    const before = new Set(PRE_EXISTING.map(hashItemDefinition));
    const beforeIds = new Set(PRE_EXISTING.map((item) => item.item_version_id));
    expect(before.size, "nothing pre-existing was read").toBeGreaterThan(500);
    for (const item of PRACTICE_WALK_ITEM_PACK) {
      expect(
        before,
        `${item.item_version_id} repeats content already frozen elsewhere`,
      ).not.toContain(hashItemDefinition(item));
      expect(beforeIds, `${item.item_version_id} is not a new id`).not.toContain(
        item.item_version_id,
      );
    }
    // And within itself, which `validateWalkPool` checks per cell but not across nodes.
    const mine = PRACTICE_WALK_ITEM_PACK.map(hashItemDefinition);
    expect(new Set(mine).size, "two items in this pack share content").toBe(mine.length);
  });

  /**
   * The same claim a second way, through the shipped validator over the WHOLE bank — which is
   * where `practice_assessment_reuse` and `duplicate_item_version_id` actually live, and which
   * reads the union rather than one side of it.
   *
   * **IT CARRIES AN EXPLICIT BUDGET, AND THE NUMBER IS MEASURED RATHER THAN GUESSED.** It grades
   * roughly 1,900 authored keys through `createProductAnswerChecker`: 3.2s on this developer
   * machine, and past the `packages` project's 5s default on GitHub's two-core runner — which is
   * exactly how it failed CI while passing locally, and the only shard it failed on was the one
   * that also carries `d1-answer-checker` and the graph comparator.
   *
   * No other test in this project has needed a budget, so this is the first and it says why.
   * The number is an order of magnitude over the measured cost on purpose: the point is to stop a
   * slow runner failing a correct assertion, not to police runtime. The cheap test above is what
   * guards the property on every run, so if this one ever does time out the claim is still held.
   *
   * **It went 30s to 120s when D4's Early Modern and Industrial pools and D9's TRG variation
   * added 104 items**, at which point it began timing out on this developer machine rather than
   * only on a two-core runner. A timeout here is worse than a slow test, because the assertion
   * never runs: it reports nothing while looking like it reports green.
   */
  it("and again through the whole bank's own validator", () => {
    expect(
      validateItemBank(
        [...PRE_EXISTING, ...PRACTICE_WALK_ITEM_PACK],
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  }, 120_000);

  it("takes the neutral prompt and leaves the answer alone", () => {
    // `GenerateContext` lets a template theme its `practice` prompt, and the contract is that
    // the math, the params and the KEY do not depend on it. Freezing at "A" relies on that
    // contract for every template here, so it is measured rather than trusted: same template,
    // same seed, two contexts.
    expect(PRACTICE_WALK_TEMPLATES.length).toBeGreaterThanOrEqual(40);
    for (const template of PRACTICE_WALK_TEMPLATES) {
      const asAssessment = generateFromTemplate(template, "A", 4_000_111);
      const asPractice = generateFromTemplate(template, "practice", 4_000_111);
      expect(
        asAssessment.answer,
        `${template.template_id}'s answer depends on the item form`,
      ).toEqual(asPractice.answer);
      expect(asAssessment.template_params).toEqual(asPractice.template_params);
    }
  });
});

describe("the drawable-space ledger", () => {
  /**
   * Budgeted for the same measured reason as the whole-bank validator above, and pre-emptively
   * rather than after a red: it draws {@link PROBE_SEEDS} instances from each of seventy-seven
   * templates — 308,000 `generate()` calls, 1.7s here, which is close enough to the project's
   * 5s default that a two-core runner under load is a coin toss. The seed count is what makes
   * this an exhaustive count rather than a sample for every template that could be short, so
   * the right move is to pay for it rather than to sample less and weaken the equality.
   */
  it("lists every short template and no others", { timeout: 30_000 }, () => {
    // BOTH DIRECTIONS over the derived candidate set. Direction one: a listed template really
    // is short, and by the recorded amount — a stale number would silently change which
    // arrangement `planNode` picks. Direction two: nothing unlisted is short, which is what
    // stops the next thin template being discovered as a parallel-form collision in
    // production instead of here.
    const listed: string[] = [];
    for (const template of PRACTICE_WALK_CANDIDATES) {
      const credited = templateBudget(template.template_id);
      const measured = measuredBudget(template.template_id);
      if (credited < DIAGNOSTIC_WALK_ITEMS_PER_FORM * 2) {
        listed.push(template.template_id);
        expect(
          measured,
          `${template.template_id} is credited ${credited} fresh draws and measures ${measured}`,
        ).toBe(credited);
      } else {
        expect(
          measured,
          `${template.template_id} is credited a full budget but only draws ${measured} fresh items, so it can emit a duplicate into both forms`,
        ).toBeGreaterThanOrEqual(DIAGNOSTIC_WALK_ITEMS_PER_FORM * 2);
      }
    }
    // A floor on the list, so an empty ledger cannot pass this by describing nothing, and a
    // ceiling so a ledger that grew to swallow the population would fail.
    expect(listed.length, "the ledger describes nothing").toBeGreaterThanOrEqual(5);
    expect(listed.length).toBeLessThan(PRACTICE_WALK_CANDIDATES.length / 4);
  });

  it("is load-bearing: crediting a spent template collides both forms", () => {
    // The injection. Take a template the ledger says has nothing left, hand it to the shipped
    // freezer exactly as a fully-funded template would be handled, and watch the collision the
    // ledger exists to prevent actually happen. This is what makes the exclusion a measured
    // fact rather than a cautious one.
    const spent = PRACTICE_WALK_CANDIDATES.find(
      (template) => templateBudget(template.template_id) === 0,
    );
    expect(spent, "no fully spent template exists to inject with").toBeDefined();
    if (!spent) {
      return;
    }
    const forms = freezeDeepParallelForms([spent], {
      instancesPerCell: DIAGNOSTIC_WALK_ITEMS_PER_FORM,
      seedBaseA: 9_100_000,
      seedBaseB: 9_200_000,
      avoidHashes: PRE_EXISTING.map(hashItemDefinition),
    });
    const issues = validateWalkPool(
      [...forms.formA, ...forms.formB],
      { nodes: [spent.node_id], minItemsPerCell: DIAGNOSTIC_WALK_ITEMS_PER_FORM },
      PRODUCT_CHECKER_CONFIG,
    );
    expect(
      issues.map((issue) => issue.code),
      `${spent.template_id} was credited a budget it does not have and the freezer produced a clean pool anyway, so the ledger is protecting nothing`,
    ).toContain("parallel_form_collision");
  });

  it("names every node it could not serve, and each one really cannot be", () => {
    // The excluded set, both ways. A node named here must genuinely have no arrangement
    // available; a candidate node NOT named here must have made it into the pack.
    const named = new Set(EXHAUSTED_TEMPLATE_NODES.map((row) => row.node_id));
    const candidates = new Set(PRACTICE_WALK_CANDIDATES.map((t) => t.node_id));

    // THE FLOOR IS ON THE POPULATION, NOT ON THE EXCLUDED SET, and that is a deliberate
    // change of shape rather than a lowered number. This used to require at least one excluded
    // node, which was true while `EL.3`, `TRG.7` and `TRG.8` were short of drawable space and
    // became false the moment they were authored — the goal state failing the guard written to
    // watch for the problem. An empty exclusion list is the right answer now, so what has to be
    // ruled out instead is a derivation that excluded nothing because it CONSIDERED nothing.
    //
    // So the claim is a partition: every candidate node is either served or named, the two do
    // not overlap, and the population they partition has a floor under it. That holds whether
    // the excluded set is empty or not, and it goes red on a candidate set that quietly emptied,
    // which is what the old floor was really protecting against.
    expect(
      candidates.size,
      "no node is a candidate, so this partitions nothing",
    ).toBeGreaterThanOrEqual(30);
    for (const nodeId of candidates) {
      const isServed = PRACTICE_WALK_NODES.includes(nodeId);
      expect(
        isServed !== named.has(nodeId),
        `${nodeId} is a candidate and is ${isServed ? "both served and named" : "neither served nor named"}`,
      ).toBe(true);
    }

    for (const row of EXHAUSTED_TEMPLATE_NODES) {
      expect(PRACTICE_WALK_NODES, `${row.node_id} is both named and served`).not.toContain(
        row.node_id,
      );
      expect(
        row.budgets.length,
        `${row.node_id} has no templates recorded`,
      ).toBeGreaterThan(0);
      // No arrangement: no single template can fund a cell alone, and fewer than two can
      // share one. Those are exactly `planNode`'s two cases.
      const alone = row.budgets.filter(
        (b) => b.fresh >= DIAGNOSTIC_WALK_ITEMS_PER_FORM * 2,
      ).length;
      const shared = row.budgets.filter((b) => b.fresh >= 4).length;
      expect(alone, `${row.node_id} has a template that could serve it alone`).toBe(0);
      expect(
        shared,
        `${row.node_id} has two templates that could share a cell`,
      ).toBeLessThan(2);
    }
  });
});
