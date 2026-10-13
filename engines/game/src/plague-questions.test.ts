import { ERA_SEQUENCE, type EraId, getEraOrThrow } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { PLAGUE_ERA } from "./plague";
import {
  composePlagueBatch,
  type PlagueQuestionCandidate,
  plagueBatchFor,
  plagueEligibleNodes,
  plagueEncounterSeed,
  plagueSkillOrder,
  plagueWindow,
  plagueWindowReach,
  plagueWindowSlots,
} from "./plague-questions";
import { PLAGUE } from "./plague-tuning";
import { successionWindow } from "./succession-questions";

/**
 * **THE QUESTIONS ERA SIX ASKS: D-CRISIS-14's WINDOW, APPORTIONED, AND HELD AGAINST ERA
 * FOUR'S COPY OF THE SAME DERIVATION.**
 *
 * Era four's composer is the model and this suite carries the assertions that are era six's
 * own, plus one that exists because of the duplication: `plagueWindow` and `successionWindow`
 * compute the same collapse over different tuning tables, and this file asserts they AGREE,
 * era by era, over three mastery sets. That is what makes the second copy safe rather than a
 * second thing to keep true — a divergence goes red here rather than shipping.
 *
 * Era six's own additions are the ones its cycle unit forces: a cycle may hold no batch at
 * all, so the sequence is keyed to the cycle rather than to how many batches have been
 * answered, and skipping a cycle skips its questions rather than deferring them.
 */

const BATCH = PLAGUE.cycle.batch_size;

/** An item pool over a node set: `count` items per node, ids stable per node. */
function pool(nodeIds: readonly string[], count: number): PlagueQuestionCandidate[] {
  const items: PlagueQuestionCandidate[] = [];
  for (const nodeId of nodeIds) {
    for (let index = 0; index < count; index += 1) {
      items.push({
        item_version_id: `${nodeId}#${index}`,
        node_id: nodeId,
        prompt: `${nodeId} question ${index}`,
      });
    }
  }
  return items;
}

/** Every node of era six's window, which is what a legitimate arrival has finished. */
function windowNodes(): readonly string[] {
  return plagueEligibleNodes(plagueWindow({ mastered: everyNode() }));
}

function everyNode(): readonly string[] {
  return ERA_SEQUENCE.flatMap((era) => era.nodes);
}

describe("era six's question window is derived from the era sequence", () => {
  it("reaches era six plus the two behind it, at the ruled shares", () => {
    const buckets = plagueWindow({ mastered: everyNode() });

    expect(buckets.map((bucket) => bucket.era)).toEqual<EraId[]>([
      "renaissance",
      "medieval",
      "classical",
    ]);
    expect(buckets.map((bucket) => bucket.share)).toEqual([40, 35, 25]);
    expect(buckets.map((bucket) => bucket.eras_back)).toEqual([0, 1, 2]);
    // Era six needs no exception: every bucket can serve, so the collapse never fires.
    for (const bucket of buckets) {
      expect(bucket.node_ids.length, bucket.era).toBeGreaterThan(0);
      expect(bucket.node_ids).toEqual(getEraOrThrow(bucket.era).nodes);
    }
    expect(buckets.reduce((total, bucket) => total + bucket.share, 0)).toBe(100);
  });

  it("reproduces D-CRISIS-14's two written-down exceptions by collapsing", () => {
    // The check on the derivation rather than a use of it: era six's window needs neither of
    // these, and reproducing both is how the collapse rule is shown to be the ruling's.
    const eraTwo = plagueWindow({ era: "neolithic", mastered: everyNode() });
    expect(eraTwo.map((bucket) => bucket.share)).toEqual([40, 60]);

    const eraOne = plagueWindow({ era: "prehistoric", mastered: everyNode() });
    expect(eraOne.map((bucket) => bucket.share)).toEqual([100]);
    // And renormalising in proportion is NOT what happens: era two renormalised is 53/47.
    expect(eraTwo[1]?.share).not.toBe(47);
  });

  /**
   * **THE DUPLICATION, PINNED.** Two tuning tables, two functions, one derivation. If either
   * era's shares are retuned the two stop agreeing and this fails, which is the whole reason
   * the second copy is allowed to exist.
   */
  it("agrees with era four's copy of the same derivation, era by era", () => {
    const masterySets: readonly (readonly string[])[] = [
      everyNode(),
      [],
      ERA_SEQUENCE.flatMap((era) => era.nodes.slice(0, 2)),
    ];

    let compared = 0;
    for (const era of ERA_SEQUENCE) {
      for (const mastered of masterySets) {
        const mine = plagueWindow({ era: era.id, mastered });
        const theirs = successionWindow({ era: era.id, mastered });
        compared += 1;

        expect(
          mine.map((bucket) => `${bucket.era}:${bucket.eras_back}:${bucket.share}`),
          `${era.id} windows disagree`,
        ).toEqual(
          theirs.map((bucket) => `${bucket.era}:${bucket.eras_back}:${bucket.share}`),
        );
        expect(mine.map((bucket) => bucket.node_ids.join(","))).toEqual(
          theirs.map((bucket) => bucket.node_ids.join(",")),
        );
      }
    }
    // A floor, because "the two agree" holds trivially over no comparisons.
    expect(compared).toBe(ERA_SEQUENCE.length * masterySets.length);
    expect(compared).toBeGreaterThanOrEqual(30);
  });

  it("refuses an era the sequence does not have, and a share list of the wrong length", () => {
    expect(() => plagueWindow({ era: "atlantis" as EraId, mastered: [] })).toThrow();

    // The table agrees with itself, which is the data half...
    expect(PLAGUE.window.shares_percent).toHaveLength(PLAGUE.window.eras_back + 1);
    expect(
      plagueWindowReach(PLAGUE.window.eras_back, PLAGUE.window.shares_percent.length),
    ).toBe(PLAGUE.window.eras_back);
    // ...and the guard behind it refuses a table that does not, which is the half a run over
    // the shipped values can never reach. A reach of three over three shares reads the fourth
    // bucket's weight off the end of the list and ships a bucket with no share at all, which
    // is a silent wrong answer rather than a crash — so the refusal has to be loud.
    expect(() => plagueWindowReach(3, 3)).toThrow(/reaches 3 era\(s\) back and carries 3/);
    expect(() => plagueWindowReach(1, 3)).toThrow(/One share per era in the window/);
  });

  it("drops a bucket the learner cannot fill rather than allocating it a slot", () => {
    // A learner who finished era six's own nodes and nothing older. The mix falls to the one
    // bucket that can serve rather than the cycle being refused, which is INV-CRISIS-3.
    const onlySix = plagueWindow({ mastered: getEraOrThrow(PLAGUE_ERA).nodes });
    const slots = plagueWindowSlots({ buckets: onlySix, cycle: 1 });

    expect(slots).toHaveLength(BATCH);
    expect(new Set(slots)).toEqual(new Set<EraId>(["renaissance"]));
  });
});

describe("the batch is apportioned, not sampled", () => {
  it("tracks the ruled shares at every prefix of an encounter", () => {
    const buckets = plagueWindow({ mastered: everyNode() });
    const taken = new Map<EraId, number>();
    let asked = 0;

    for (let cycle = 1; cycle <= 8; cycle += 1) {
      for (const era of plagueWindowSlots({ buckets, cycle })) {
        taken.set(era, (taken.get(era) ?? 0) + 1);
        asked += 1;
      }
      // At every prefix each bucket is within one question of its ruled share of what has
      // been asked. That is the property a weighted draw does not have.
      for (const bucket of buckets) {
        const owed = (bucket.share * asked) / 100;
        expect(
          Math.abs((taken.get(bucket.era) ?? 0) - owed),
          `${bucket.era} after ${asked} questions`,
        ).toBeLessThan(1);
      }
    }
    expect(asked).toBe(8 * BATCH);
    // And every bucket really was served, so the assertion above is not about an empty map.
    for (const bucket of buckets) {
      expect(taken.get(bucket.era) ?? 0, bucket.era).toBeGreaterThan(0);
    }
  });

  it("gives the current era its ruled share rather than a uniform one", () => {
    // The defect D-CRISIS-14 exists to prevent, measured on era six's own window at the
    // trigger: three of era six's six nodes mastered against two complete eras behind it.
    const atTrigger = getEraOrThrow(PLAGUE_ERA).nodes.slice(0, 3);
    const mastered = [
      ...atTrigger,
      ...getEraOrThrow("medieval").nodes,
      ...getEraOrThrow("classical").nodes,
    ];
    const buckets = plagueWindow({ mastered });
    const eligible = plagueEligibleNodes(buckets);

    // Thirteen eligible nodes: three of era six's own plus two complete eras of five. A
    // uniform draw across nodes hands era six's own chapter 23%, which is the same figure era
    // four measured on its own window, because the two windows happen to be the same size.
    expect(eligible).toHaveLength(13);
    const uniform = (3 / eligible.length) * 100;
    expect(Math.round(uniform)).toBe(23);
    expect(buckets[0]?.share).toBe(40);
    // The ruled share is well over half again what a uniform draw would give era six's own
    // chapter, so the apportionment is doing real work rather than agreeing by coincidence.
    expect((buckets[0]?.share as number) / uniform).toBeGreaterThan(1.7);
  });

  it("refuses a cycle index that is not a whole number from one", () => {
    const buckets = plagueWindow({ mastered: everyNode() });
    expect(() => plagueWindowSlots({ buckets, cycle: 0 })).toThrow(/whole number from 1/);
    expect(() => plagueSkillOrder({ buckets, encounterSeed: 1, cycle: -1 })).toThrow(
      /whole number from 1/,
    );
    expect(() => plagueEncounterSeed(0)).toThrow(/whole number from 1/);
  });
});

describe("the skill order prefers without constraining", () => {
  it("names one skill per slot, then every other eligible node", () => {
    const buckets = plagueWindow({ mastered: everyNode() });
    const order = plagueSkillOrder({ buckets, encounterSeed: 7, cycle: 1 });
    const eligible = plagueEligibleNodes(buckets);

    expect(order.slice(0, BATCH).every((nodeId) => eligible.includes(nodeId))).toBe(true);
    // The tail is what makes it a preference: every eligible node is reachable, so a
    // preferred skill the pool has run out of costs a reorder rather than a refused cycle.
    expect(new Set(order)).toEqual(new Set(eligible));
    expect(order.length).toBeGreaterThanOrEqual(eligible.length);
  });

  it("spreads across the window's skills rather than re-asking one", () => {
    // D-CRISIS-15, over the first block of cycles: every node of the current bucket appears
    // before any repeats, which is the shuffled bag's own property.
    const buckets = plagueWindow({ mastered: everyNode() });
    const asked: string[] = [];
    for (let cycle = 1; cycle <= 6; cycle += 1) {
      asked.push(
        ...plagueSkillOrder({ buckets, encounterSeed: 11, cycle }).slice(0, BATCH),
      );
    }
    const counts = new Map<string, number>();
    for (const nodeId of asked) {
      counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1);
    }
    // Nothing is asked more than twice as often as the least-asked skill of its own era, so
    // no skill is hammered while others in the window go untouched.
    const spread = [...counts.values()];
    expect(Math.max(...spread)).toBeLessThanOrEqual(Math.min(...spread) + 2);
    expect(counts.size).toBeGreaterThanOrEqual(6);
  });
});

describe("a batch is drawn or refused, and never served short", () => {
  it("draws the full batch when the pool can serve it", () => {
    const nodes = windowNodes();
    const composed = plagueBatchFor({
      mastered: everyNode(),
      pool: pool(nodes, 3),
      encounter: 1,
      cycle: 1,
    });

    expect(composed.status).toBe("ready");
    if (composed.status !== "ready") {
      throw new Error("expected a ready batch");
    }
    expect(composed.size).toBe(BATCH);
    expect(composed.prompts).toHaveLength(BATCH);
    expect(new Set(composed.prompts.map((prompt) => prompt.item_version_id)).size).toBe(
      BATCH,
    );
    for (const prompt of composed.prompts) {
      expect(nodes).toContain(prompt.node_id);
      expect(getEraOrThrow(prompt.era).nodes).toContain(prompt.node_id);
    }
  });

  it("refuses when nothing is mastered and when the pool is too thin", () => {
    const nothing = plagueBatchFor({ mastered: [], pool: [], encounter: 1, cycle: 1 });
    expect(nothing.status).toBe("unavailable");
    if (nothing.status !== "unavailable") {
      throw new Error("expected a refusal");
    }
    expect(nothing.reason).toBe("nothing_mastered");
    expect(nothing.wanted).toBe(BATCH);

    const thin = plagueBatchFor({
      mastered: everyNode(),
      pool: pool(windowNodes().slice(0, 1), 1),
      encounter: 1,
      cycle: 1,
    });
    expect(thin.status).toBe("unavailable");
    if (thin.status !== "unavailable") {
      throw new Error("expected a refusal");
    }
    expect(thin.reason).toBe("pool_too_thin");
    expect(thin.available).toBe(1);
    // Era six's own reason for the refusal, which is neither era one's nor era four's: a
    // short batch would put the top rung of the hold ladder out of reach.
    expect(thin.message).toMatch(/top rung/);
  });

  it("is deterministic in (encounter, cycle) and different across both axes", () => {
    const nodes = windowNodes();
    const items = pool(nodes, 4);
    const draw = (encounter: number, cycle: number): string =>
      JSON.stringify(
        (
          plagueBatchFor({ mastered: everyNode(), pool: items, encounter, cycle }) as {
            readonly prompts: readonly { readonly item_version_id: string }[];
          }
        ).prompts.map((prompt) => prompt.item_version_id),
      );

    expect(draw(2, 3)).toBe(draw(2, 3));
    expect(draw(2, 3)).not.toBe(draw(2, 4));
    expect(draw(2, 3)).not.toBe(draw(3, 3));
  });

  it("takes the caller's RNG with no fallback, so no path here is unseeded", () => {
    // The composer's own contract: a required stream. Era six's engine has no unseeded draw
    // at all, which is what lets `test/plagueTopology.test.ts` mean its clock sweep.
    const nodes = windowNodes();
    let calls = 0;
    const composed = composePlagueBatch(
      plagueWindow({ mastered: everyNode() }),
      pool(nodes, 2),
      {
        rng: () => {
          calls += 1;
          return 0.5;
        },
        skill_order: [...nodes],
      },
    );

    expect(composed.status).toBe("ready");
    expect(calls).toBeGreaterThan(0);
  });

  it("lets the skill order reorder a draw and never shrink one", () => {
    const nodes = windowNodes();
    const items = pool(nodes, 2);
    const buckets = plagueWindow({ mastered: everyNode() });

    // An order naming a node outside the window is dropped; a node the order does not name is
    // still reachable. Either way the batch is full.
    const withJunk = composePlagueBatch(buckets, items, {
      rng: () => 0.5,
      skill_order: ["NOT.A.NODE", ...nodes.slice(0, 1)],
    });
    expect(withJunk.status).toBe("ready");
    const withNone = composePlagueBatch(buckets, items, {
      rng: () => 0.5,
      skill_order: [],
    });
    expect(withNone.status).toBe("ready");
  });
});
