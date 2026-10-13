import { type EraId, getEraOrThrow } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { createSeededRng } from "./citizens-rng";
import { RELAY_ERA } from "./relay";
import {
  composeIntrusionBatch,
  type IntrusionQuestionCandidate,
  intrusionBatchFor,
  intrusionEligibleNodes,
  intrusionEncounterSeed,
  intrusionServableWindow,
  intrusionSkillOrder,
  intrusionWindow,
  intrusionWindowSlots,
} from "./intrusion-questions";
import { RELAY } from "./relay-tuning";

/**
 * **THE COMPOSER: D-CRISIS-14's window, apportioned over one check.**
 *
 * Two things this file is careful about, and both are era nine's rather than inherited.
 * The window's oldest bucket is EMPTY in the shipped content, so the drop path is not a
 * theoretical branch here — it fires on every real check, and the tests measure the mix
 * that results rather than the mix the ruling asks for. And the unit is a CHECK: a count of
 * diagnostics the player chose to pay for, not a cycle that turns whether they act or not.
 */

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

const ERA_NINE = getEraOrThrow("information_age").nodes;
const ERA_EIGHT = getEraOrThrow("atomic_age").nodes;
const ERA_SEVEN = getEraOrThrow("industrial").nodes;

/** A learner who has finished every node of all three eras in the window. */
const EVERYTHING: readonly string[] = [...ERA_NINE, ...ERA_EIGHT, ...ERA_SEVEN];

/** A synthetic pool: `per` questions behind each of `nodes`. */
function poolOver(
  nodes: readonly string[],
  per: number,
): readonly IntrusionQuestionCandidate[] {
  return nodes.flatMap((nodeId) =>
    Array.from({ length: per }, (_value, index) => ({
      item_version_id: `${nodeId}#${index}`,
      node_id: nodeId,
      prompt: `A question about ${nodeId}, number ${index}.`,
    })),
  );
}

/* -------------------------------------------------------------------------- */
/* The window                                                                 */
/* -------------------------------------------------------------------------- */

describe("the window is derived from the era sequence", () => {
  it("reaches era nine, era eight and era seven, with D-CRISIS-14's shares", () => {
    const buckets = intrusionWindow({ mastered: EVERYTHING });

    expect(buckets.map((bucket) => bucket.era)).toEqual([
      "information_age",
      "atomic_age",
      "industrial",
    ]);
    expect(buckets.map((bucket) => bucket.share)).toEqual([...RELAY.window.shares_percent]);
    expect(buckets.map((bucket) => bucket.eras_back)).toEqual([0, 1, 2]);
    expect(buckets.reduce((total, bucket) => total + bucket.share, 0)).toBe(100);
    // The share list has to be one per era in the window, or a slot lands in a bucket
    // with no weight.
    expect(RELAY.window.shares_percent.length).toBe(RELAY.window.eras_back + 1);
  });

  it("filters each bucket to the nodes the learner has finished", () => {
    const partial = [...ERA_NINE.slice(0, 3), ...ERA_EIGHT];
    const buckets = intrusionWindow({ mastered: partial });

    expect(buckets[0]?.node_ids).toEqual(ERA_NINE.slice(0, 3));
    expect(buckets[1]?.node_ids).toEqual([...ERA_EIGHT]);
    expect(buckets[2]?.node_ids).toEqual([]);
    // The RULED window keeps the empty bucket and its share, so the shortfall is visible
    // rather than absorbed. Narrowing is a separate call.
    expect(buckets[2]?.share).toBe(25);
    expect(buckets.length).toBe(3);
  });

  /**
   * The collapse reproduces both of D-CRISIS-14's written-down exceptions. Era nine needs
   * neither, so this is a check on the derivation rather than a use of it — which is the
   * only way to tell a derivation from a lookup table.
   */
  it("reproduces D-CRISIS-14's two named exceptions from the same rule", () => {
    const eraTwo = intrusionWindow({
      era: "neolithic",
      mastered: [
        ...getEraOrThrow("neolithic").nodes,
        ...getEraOrThrow("prehistoric").nodes,
      ],
    });
    expect(eraTwo.map((bucket) => bucket.era)).toEqual(["neolithic", "prehistoric"]);
    // The ruling says 40/60, and renormalising in proportion would say 53/47.
    expect(eraTwo.map((bucket) => bucket.share)).toEqual([40, 60]);

    const eraOne = intrusionWindow({
      era: "prehistoric",
      mastered: getEraOrThrow("prehistoric").nodes,
    });
    expect(eraOne.map((bucket) => bucket.share)).toEqual([100]);
    expect(eraOne.length).toBe(1);
  });

  it("fails loud on an era the sequence does not have", () => {
    expect(() => intrusionWindow({ era: "atlantis" as EraId, mastered: [] })).toThrow();
  });
});

/* -------------------------------------------------------------------------- */
/* The narrowing, which is era nine's own departure                           */
/* -------------------------------------------------------------------------- */

describe("a bucket the pool cannot fill is dropped before the apportionment", () => {
  it("drops a bucket with no authored items and narrows the ones that have some", () => {
    const ruled = intrusionWindow({ mastered: EVERYTHING });
    // Era seven has nothing; era eight has questions behind four of its nine nodes.
    const pool = poolOver([...ERA_NINE, ...ERA_EIGHT.slice(-4)], 8);
    const servable = intrusionServableWindow(ruled, pool);

    expect(ruled.length).toBe(3);
    expect(servable.map((bucket) => bucket.era)).toEqual(["information_age", "atomic_age"]);
    expect(servable[0]?.node_ids).toEqual([...ERA_NINE]);
    expect(servable[1]?.node_ids).toEqual(ERA_EIGHT.slice(-4));
    // The shares are NOT renormalised: the apportionment compares them as ratios, so the
    // realised mix is the ruled mix over the buckets that exist.
    expect(servable.map((bucket) => bucket.share)).toEqual([40, 35]);
  });

  it("changes the mix, which is the whole reason it happens before the apportionment", () => {
    const ruled = intrusionWindow({ mastered: EVERYTHING });
    const pool = poolOver([...ERA_NINE, ...ERA_EIGHT.slice(-4)], 8);
    const servable = intrusionServableWindow(ruled, pool);

    const ruledSlots = [1, 2, 3, 4, 5].flatMap((check) =>
      intrusionWindowSlots({ buckets: ruled, check }),
    );
    const servableSlots = [1, 2, 3, 4, 5].flatMap((check) =>
      intrusionWindowSlots({ buckets: servable, check }),
    );

    // Under the ruled window a quarter of the slots go to a bucket that has nothing to
    // give, which is the defect the narrowing exists to prevent.
    expect(ruledSlots.filter((era) => era === "industrial").length).toBeGreaterThanOrEqual(
      3,
    );
    expect(servableSlots.filter((era) => era === "industrial").length).toBe(0);
    expect(new Set(servableSlots)).toEqual(new Set(["information_age", "atomic_age"]));
  });

  it("keeps every bucket when the pool can fill every one", () => {
    const ruled = intrusionWindow({ mastered: EVERYTHING });
    const servable = intrusionServableWindow(ruled, poolOver(EVERYTHING, 4));
    expect(servable.map((bucket) => bucket.era)).toEqual(ruled.map((bucket) => bucket.era));
    expect(servable.map((bucket) => bucket.node_ids.length)).toEqual(
      ruled.map((bucket) => bucket.node_ids.length),
    );
  });
});

/* -------------------------------------------------------------------------- */
/* The apportionment                                                          */
/* -------------------------------------------------------------------------- */

describe("the mix is apportioned rather than sampled", () => {
  it("serves one check's worth of slots per check, in slot order", () => {
    const buckets = intrusionWindow({ mastered: EVERYTHING });
    for (const check of [1, 2, 3, 7]) {
      expect(intrusionWindowSlots({ buckets, check }).length).toBe(
        RELAY.questions_per_round,
      );
    }
    expect(() => intrusionWindowSlots({ buckets, check: 0 })).toThrow(
      /whole number from 1/,
    );
  });

  it("tracks each bucket's ruled share at every prefix, not only in the limit", () => {
    const buckets = intrusionWindow({ mastered: EVERYTHING });
    const slots = Array.from({ length: 14 }, (_value, index) => index + 1).flatMap(
      (check) => intrusionWindowSlots({ buckets, check }),
    );

    const shares = new Map<EraId, number>();
    for (const [index, era] of slots.entries()) {
      shares.set(era, (shares.get(era) ?? 0) + 1);
      const asked = index + 1;
      for (const bucket of buckets) {
        const held = shares.get(bucket.era) ?? 0;
        // Apportionment's own guarantee: after `n` questions every bucket holds its share
        // of `n` to within one whole question.
        expect(
          Math.abs(held - (bucket.share * asked) / 100),
          `${bucket.era}@${asked}`,
        ).toBeLessThan(1);
      }
    }
    // And the realised mix really is the ruled one over a whole encounter's worth.
    expect((shares.get("information_age") ?? 0) / slots.length).toBeGreaterThan(0.35);
    expect(shares.get("industrial")).toBeGreaterThan(0);
  });

  it("breaks a tie toward the chapter the player is standing in", () => {
    // Three equal buckets: every tie goes to the earlier one, so the first slot is the
    // current era rather than an older one.
    const buckets = intrusionWindow({ mastered: EVERYTHING }).map((bucket) => ({
      ...bucket,
      share: 100,
    }));
    expect(intrusionWindowSlots({ buckets, check: 1 })[0]).toBe("information_age");
  });

  it("returns nothing when no bucket can serve, which is what the composer refuses", () => {
    const buckets = intrusionWindow({ mastered: [] });
    expect(intrusionWindowSlots({ buckets, check: 1 })).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* The skill order                                                            */
/* -------------------------------------------------------------------------- */

describe("the skill order spreads across a bucket before repeating inside it", () => {
  it("names one skill per slot, and every eligible node after them", () => {
    const buckets = intrusionWindow({ mastered: EVERYTHING });
    const order = intrusionSkillOrder({
      buckets,
      encounterSeed: intrusionEncounterSeed(1),
      check: 1,
    });
    const eligible = intrusionEligibleNodes(buckets);

    expect(order.length).toBe(eligible.length);
    expect([...order].sort()).toEqual([...eligible].sort());
    expect(new Set(order).size).toBe(order.length);
  });

  it("holds D-CRISIS-15: every skill of a bucket before any repeats", () => {
    const buckets = intrusionServableWindow(
      intrusionWindow({ mastered: EVERYTHING }),
      poolOver([...ERA_NINE, ...ERA_EIGHT.slice(-4)], 12),
    );
    const seed = intrusionEncounterSeed(4);
    const preferred = Array.from({ length: 12 }, (_value, index) => index + 1).flatMap(
      (check) =>
        intrusionSkillOrder({ buckets, encounterSeed: seed, check }).slice(
          0,
          RELAY.questions_per_round,
        ),
    );

    const nine = preferred.filter((nodeId) => ERA_NINE.includes(nodeId));
    // The first block of era nine's own skills holds every one of them exactly once.
    const firstBlock = nine.slice(0, ERA_NINE.length);
    expect(new Set(firstBlock).size).toBe(ERA_NINE.length);
    expect(nine.length).toBeGreaterThan(ERA_NINE.length);
  });

  it("is stable across the checks of one encounter and differs between encounters", () => {
    const buckets = intrusionWindow({ mastered: EVERYTHING });
    const signature = (encounter: number) =>
      Array.from({ length: 5 }, (_value, index) => index + 1)
        .map((check) =>
          intrusionSkillOrder({
            buckets,
            encounterSeed: intrusionEncounterSeed(encounter),
            check,
          }).join("|"),
        )
        .join("/");

    expect(signature(2)).toBe(signature(2));
    expect(new Set([1, 2, 3, 4].map(signature)).size).toBeGreaterThan(1);
    expect(() => intrusionEncounterSeed(0)).toThrow(/whole number from 1/);
  });
});

/* -------------------------------------------------------------------------- */
/* The draw                                                                   */
/* -------------------------------------------------------------------------- */

describe("a check is drawn whole or refused", () => {
  it("draws exactly the check's size, distinct, and from the window", () => {
    const buckets = intrusionWindow({ mastered: EVERYTHING });
    const pool = poolOver(EVERYTHING, 5);
    const composed = composeIntrusionBatch(buckets, pool, {
      rng: createSeededRng(11),
      skill_order: intrusionSkillOrder({
        buckets,
        encounterSeed: intrusionEncounterSeed(1),
        check: 1,
      }),
    });

    expect(composed.status).toBe("ready");
    if (composed.status !== "ready") {
      return;
    }
    expect(composed.prompts.length).toBe(RELAY.questions_per_round);
    expect(new Set(composed.prompts.map((p) => p.item_version_id)).size).toBe(
      composed.prompts.length,
    );
    // Spread across skills rather than clustered on one.
    expect(new Set(composed.prompts.map((p) => p.node_id)).size).toBe(
      composed.prompts.length,
    );
    for (const prompt of composed.prompts) {
      expect(EVERYTHING).toContain(prompt.node_id);
      expect(getEraOrThrow(prompt.era).nodes).toContain(prompt.node_id);
    }
  });

  it("refuses when the learner has finished nothing, and says why", () => {
    const composed = composeIntrusionBatch(intrusionWindow({ mastered: [] }), [], {
      rng: createSeededRng(1),
      skill_order: [],
    });
    expect(composed.status).toBe("unavailable");
    if (composed.status !== "unavailable") {
      return;
    }
    expect(composed.reason).toBe("nothing_mastered");
    expect(composed.available).toBe(0);
    expect(composed.message).toMatch(/nothing to ask/);
  });

  it("refuses a short draw rather than serving one, for era nine's own reason", () => {
    const buckets = intrusionWindow({ mastered: EVERYTHING });
    const thin = poolOver(ERA_NINE.slice(0, 1), 2);
    const composed = composeIntrusionBatch(buckets, thin, {
      rng: createSeededRng(3),
      skill_order: [],
    });

    expect(composed.status).toBe("unavailable");
    if (composed.status !== "unavailable") {
      return;
    }
    expect(composed.reason).toBe("pool_too_thin");
    expect(composed.available).toBe(2);
    expect(composed.wanted).toBe(RELAY.questions_per_round);
    // The reason is era nine's and not era one's or era four's.
    expect(composed.message).toMatch(/cheaper rung of the ladder at the full price/);
  });

  it("terminates on a pool that cannot fill the check, rather than spinning", () => {
    // A one-item pool cannot fill a three-question check. The draw loop has to fall out
    // of it: a loop that only stops on the count would spin forever here, and a hang is
    // the one failure a test timeout cannot interrupt.
    const buckets = intrusionWindow({ mastered: EVERYTHING });
    const composed = composeIntrusionBatch(buckets, poolOver(ERA_NINE.slice(0, 1), 1), {
      rng: createSeededRng(5),
      skill_order: [],
    });
    expect(composed.status).toBe("unavailable");
  });

  it("lets the skill order reorder the draw and never shrink it", () => {
    const buckets = intrusionWindow({ mastered: EVERYTHING });
    const pool = poolOver(EVERYTHING, 4);
    const nonsense = ["not-a-node", "also-not-a-node"];
    const composed = composeIntrusionBatch(buckets, pool, {
      rng: createSeededRng(7),
      skill_order: nonsense,
    });
    expect(composed.status).toBe("ready");
    if (composed.status === "ready") {
      expect(composed.prompts.length).toBe(RELAY.questions_per_round);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* The one call a surface needs                                               */
/* -------------------------------------------------------------------------- */

describe("one check's questions, derived from the encounter and the check index", () => {
  const POOL = poolOver([...ERA_NINE, ...ERA_EIGHT.slice(-4)], 10);

  it("replays identically and differs between checks and between encounters", () => {
    const signature = (encounter: number, check: number) => {
      const composed = intrusionBatchFor({
        mastered: EVERYTHING,
        pool: POOL,
        encounter,
        check,
      });
      return composed.status === "ready"
        ? composed.prompts.map((prompt) => prompt.item_version_id).join(",")
        : composed.reason;
    };

    expect(signature(2, 3)).toBe(signature(2, 3));
    expect(signature(2, 3)).not.toBe(signature(2, 4));
    expect(signature(2, 3)).not.toBe(signature(3, 3));
    expect(new Set([1, 2, 3, 4, 5].map((n) => signature(n, 1))).size).toBeGreaterThan(1);
  });

  it("computes check five without replaying the four before it", () => {
    const fifth = intrusionBatchFor({
      mastered: EVERYTHING,
      pool: POOL,
      encounter: 1,
      check: 5,
    });
    expect(fifth.status).toBe("ready");
    if (fifth.status !== "ready") {
      return;
    }
    expect(fifth.prompts.length).toBe(RELAY.questions_per_round);
    expect(() =>
      intrusionBatchFor({ mastered: EVERYTHING, pool: POOL, encounter: 1, check: 0 }),
    ).toThrow(/whole number from 1/);
  });

  it("asks only about eras the pool can serve, and mostly about era nine's own", () => {
    const asked: EraId[] = [];
    for (let check = 1; check <= 8; check += 1) {
      const composed = intrusionBatchFor({
        mastered: EVERYTHING,
        pool: POOL,
        encounter: 1,
        check,
      });
      if (composed.status === "ready") {
        asked.push(...composed.prompts.map((prompt) => prompt.era));
      }
    }

    expect(asked.length).toBe(8 * RELAY.questions_per_round);
    // Era seven has no items in this pool, so it is dropped rather than allocated slots
    // it would hand straight back.
    expect(new Set(asked)).toEqual(new Set(["information_age", "atomic_age"]));
    const current = asked.filter((era) => era === "information_age").length;
    expect(current / asked.length).toBeGreaterThan(0.5);
    expect(current / asked.length).toBeLessThan(0.6);
  });

  it("still composes when only the current era can serve", () => {
    const composed = intrusionBatchFor({
      mastered: EVERYTHING,
      pool: poolOver(ERA_NINE, 6),
      encounter: 2,
      check: 1,
    });
    expect(composed.status).toBe("ready");
    if (composed.status === "ready") {
      expect(new Set(composed.prompts.map((prompt) => prompt.era))).toEqual(
        new Set([RELAY_ERA]),
      );
    }
  });
});
