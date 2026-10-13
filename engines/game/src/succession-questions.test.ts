import { ERA_SEQUENCE, type EraId, getEraOrThrow } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { createSuccession, successionActionOffers, successionReducer } from "./succession";
import {
  composeSuccessionBatch,
  type SuccessionQuestionCandidate,
  type SuccessionWindowBucket,
  successionBatchFor,
  successionEligibleNodes,
  successionEncounterSeed,
  successionSkillOrder,
  successionWindow,
  successionWindowSlots,
} from "./succession-questions";
import { SUCCESSION } from "./succession-tuning";

/**
 * **THE QUESTIONS THE SUCCESSION ASKS** — D-CRISIS-14's window, D-CRISIS-15's no-repeat bag,
 * and the refusal that keeps a short batch off the wire.
 *
 * Pinned on RELATIONSHIPS rather than digits, like `succession.test.ts`: change a share in
 * `succession-tuning.ts` and this suite should stay green, change the shape of the draw — the
 * collapse, the apportionment's bound, the bag's coverage, the refusal — and it should not.
 *
 * ## The measured mix, at the shares this table ships
 *
 * Era four's window at the trigger is **3 mastered POL nodes, era three's 5 LIN nodes and era
 * two's 1 EXP + 4 RAD nodes**. Apportioned over a seven-cycle encounter — the longest board's
 * worst case — the realised share by prefix is:
 *
 *   | questions | era four | era three | era two |
 *   |----------:|---------:|----------:|--------:|
 *   |         3 |    33.3% |     33.3% |   33.3% |
 *   |         9 |    44.4% |     33.3% |   22.2% |
 *   |        12 |    41.7% |     33.3% |   25.0% |
 *   |        15 |    40.0% |     33.3% |   26.7% |
 *   |        21 |    42.9% |     33.3% |   23.8% |
 *   |     ruled |  **40%** |   **35%** | **25%** |
 *
 * **The worst error at any prefix is 0.60 of a question**, against a bound of one whole
 * question, and it is never zero — so the assertion below is a real approximation bound and
 * not an exact division wearing one. The first batch is necessarily 1/1/1, because three
 * questions cannot express 40/35/25 and one each is the closest whole-number answer; the
 * weights only become visible over a whole encounter, which is what the table is for.
 *
 * A UNIFORM draw over the same window gives era four's own chapter **3 of 13 = 23%**. That is
 * the defect §5.15 rules against arriving in era four, and the gap between 23% and the
 * measured 42.9% is asserted with a margin rather than described.
 */

/* -------------------------------------------------------------------------- */
/* The harness                                                                */
/* -------------------------------------------------------------------------- */

/** Era four's own nodes at the trigger: the first `ceil(n / 2)`, from the era table. */
const CURRENT_AT_TRIGGER: readonly string[] = getEraOrThrow("classical").nodes.slice(
  0,
  Math.ceil(getEraOrThrow("classical").nodes.length / 2),
);

/**
 * The learner era four's crisis actually fires for: three of era four's own nodes done, and
 * the two eras behind it complete.
 *
 * Derived from the era table rather than written out, so an era that gains or loses a node
 * moves this fixture with it instead of leaving a stale list behind.
 */
const AT_TRIGGER: readonly string[] = [
  ...CURRENT_AT_TRIGGER,
  ...getEraOrThrow("bronze_age").nodes,
  ...getEraOrThrow("neolithic").nodes,
];

/** How long the longest authored board can run: one cycle per district, plus the opener. */
const LONGEST_ENCOUNTER =
  Math.max(...SUCCESSION.boards.map((board) => board.districts.length)) + 1;

const ITEMS_PER_NODE = 6;

function pool(nodes: readonly string[]): SuccessionQuestionCandidate[] {
  const out: SuccessionQuestionCandidate[] = [];
  for (const node of nodes) {
    for (let index = 0; index < ITEMS_PER_NODE; index += 1) {
      out.push({
        item_version_id: `${node}:${index}`,
        node_id: node,
        prompt: `${node} #${index}`,
      });
    }
  }
  return out;
}

function batchFor(
  cycle: number,
  encounter = 1,
  mastered: readonly string[] = AT_TRIGGER,
  candidates: readonly SuccessionQuestionCandidate[] = pool(AT_TRIGGER),
) {
  return successionBatchFor({ mastered, pool: candidates, encounter, cycle });
}

function bucketAt(
  buckets: readonly SuccessionWindowBucket[],
  index: number,
): SuccessionWindowBucket {
  const found = buckets[index];
  if (!found) {
    throw new Error(`the window has no bucket ${index}`);
  }
  return found;
}

/** The era each question of a whole encounter is apportioned to, in order. */
function eraSequence(
  buckets: readonly SuccessionWindowBucket[],
  cycles = LONGEST_ENCOUNTER,
): readonly EraId[] {
  const out: EraId[] = [];
  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    out.push(...successionWindowSlots({ buckets, cycle }));
  }
  return out;
}

/** The skills one bucket is asked for, in order, across a whole encounter. */
function skillsFromBucket(
  buckets: readonly SuccessionWindowBucket[],
  era: EraId,
  encounter: number,
  cycles = LONGEST_ENCOUNTER,
): readonly string[] {
  const encounterSeed = successionEncounterSeed(encounter);
  const inBucket = new Set(
    (buckets.find((bucket) => bucket.era === era) as SuccessionWindowBucket).node_ids,
  );
  const out: string[] = [];
  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    const order = successionSkillOrder({ buckets, encounterSeed, cycle }).slice(
      0,
      SUCCESSION.cycle.batch_size,
    );
    for (const nodeId of order) {
      if (inBucket.has(nodeId)) {
        out.push(nodeId);
      }
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* The window                                                                 */
/* -------------------------------------------------------------------------- */

describe("D-CRISIS-14's window, derived from the era sequence", () => {
  it("reaches era four's own chapter and the two behind it, at the ruled shares", () => {
    const buckets = successionWindow({ mastered: AT_TRIGGER });

    expect(buckets.length).toBe(SUCCESSION.window.eras_back + 1);
    // Composition, not only size: three buckets of era four's own nodes would clear a count
    // and would be the crisis drawing on nothing but the chapter the player is standing in.
    expect(buckets.map((bucket) => bucket.era)).toEqual([
      "classical",
      "bronze_age",
      "neolithic",
    ]);
    expect(buckets.map((bucket) => bucket.eras_back)).toEqual([0, 1, 2]);
    expect(buckets.map((bucket) => bucket.share)).toEqual([40, 35, 25]);

    // Every bucket can serve, which is the condition that makes the weights owed at all.
    for (const bucket of buckets) {
      expect(bucket.node_ids.length, bucket.era).toBeGreaterThanOrEqual(1);
    }
    // A floor on the eligible set, because every draw assertion below holds trivially over
    // a window with one node in it.
    expect(successionEligibleNodes(buckets).length).toBeGreaterThanOrEqual(13);
  });

  /**
   * THE COLLAPSE IS CHECKED AGAINST THE TWO FIGURES THE RULING WRITES DOWN, which is what
   * makes it a derivation rather than a third table. Era two is *"40% current, 60% era one"*
   * and era one is *"100% from era one's own mastered nodes"*, and one rule produces both.
   *
   * The declined alternative is asserted directly rather than described: renormalising the
   * surviving shares in proportion gives era two 53/47, which contradicts a ruling.
   */
  it("reproduces both of D-CRISIS-14's written-down exceptions from one collapse", () => {
    const eraTwo = successionWindow({ era: "neolithic", mastered: [] });
    const eraOne = successionWindow({ era: "prehistoric", mastered: [] });

    expect(eraTwo.map((bucket) => [bucket.era, bucket.share])).toEqual([
      ["neolithic", 40],
      ["prehistoric", 60],
    ]);
    expect(eraOne.map((bucket) => [bucket.era, bucket.share])).toEqual([
      ["prehistoric", 100],
    ]);

    // And the rejected alternative, stated as arithmetic. The collapse hands the unplaced 25
    // to the OLDEST surviving bucket; renormalising would have split it in proportion and
    // landed on 53/47.
    const shares = SUCCESSION.window.shares_percent;
    expect(eraTwo[1]?.share).toBe((shares[1] as number) + (shares[2] as number));
    expect(eraTwo[0]?.share).toBe(shares[0]);
  });

  it("keeps every era's window summing to 100, over the whole sequence", () => {
    // A floor, because "every window sums to 100" is trivially true of no windows.
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);

    const reach = SUCCESSION.window.eras_back;
    for (const [index, era] of ERA_SEQUENCE.entries()) {
      const buckets = successionWindow({ era: era.id, mastered: [] });
      const total = buckets.reduce((sum, bucket) => sum + bucket.share, 0);

      expect(total, era.id).toBe(100);
      // A window never reaches past the start of the game: it has as many buckets as there
      // are eras behind it, capped at the ruled reach.
      expect(buckets.length, era.id).toBe(Math.min(reach + 1, index + 1));
      expect(buckets[0]?.era, era.id).toBe(era.id);
    }
  });

  /**
   * §5.15: *"every node of a previous era is mastered by construction"*, so filtering the two
   * older buckets is a no-op on a learner who arrived legitimately — and it is applied anyway,
   * because a dev seed is a state the game routes players into on purpose.
   *
   * Both halves are asserted, and the second is the one that discriminates: the CURRENT
   * bucket is strictly shorter than its era, because era four's crisis fires with three of
   * five nodes done. A filter that was quietly skipped would ask about POL.4 and POL.8, which
   * this learner has not reached.
   */
  it("leaves the two older buckets whole and clips the current one to what is done", () => {
    const buckets = successionWindow({ mastered: AT_TRIGGER });

    expect(buckets[1]?.node_ids).toEqual(getEraOrThrow("bronze_age").nodes);
    expect(buckets[2]?.node_ids).toEqual(getEraOrThrow("neolithic").nodes);

    const current = getEraOrThrow("classical").nodes;
    expect(bucketAt(buckets, 0).node_ids).toEqual(CURRENT_AT_TRIGGER);
    expect(bucketAt(buckets, 0).node_ids.length).toBeLessThan(current.length);
  });

  /**
   * The shares are INTEGERS because the apportionment compares two magnitudes to place a
   * question, and held as fractions none of 0.4, 0.35 or 0.25 is exact in binary — so a tie
   * would turn on rounding and the batch a player met would depend on it.
   */
  it("holds the shares as whole percentage points, current era first", () => {
    const shares = SUCCESSION.window.shares_percent;

    expect(shares.length).toBe(SUCCESSION.window.eras_back + 1);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(100);
    for (const share of shares) {
      expect(Number.isInteger(share), `${share} is not a whole number of points`).toBe(
        true,
      );
    }
    // The current era carries the largest share, which is §5.15's softening: a crisis drawing
    // only on older eras "would feel disconnected from the chapter the player is standing in".
    expect(Math.max(...shares)).toBe(shares[0]);
  });

  it("fails loud on an era the sequence does not have", () => {
    expect(() =>
      successionWindow({ era: "atlantis" as EraId, mastered: AT_TRIGGER }),
    ).toThrow();
  });

  /**
   * **THE ORDER'S CONTRACT: the apportioned slots first, and then every other eligible node.**
   *
   * The tail is what makes the order a PREFERENCE rather than a constraint, and it has to be
   * on the order itself and not only inside the composer: `successionSkillOrder` is exported,
   * so a caller can pass it anywhere, and an order that named three nodes out of thirteen
   * would be a hard constraint wearing a preference's name.
   *
   * The empty-bucket case is asserted on the same call, because a learner who skipped an era
   * presents exactly that window, and it is also where the draw's TERMINATION was found: the
   * bag used to run until its sequence was long enough, which never terminates over an empty
   * bag, and a synchronous spin is the one failure mode a test timeout cannot interrupt. The
   * injection that removed the empty-bucket filter hung the harness instead of failing it.
   */
  it("offers every eligible node, the apportioned slots first", () => {
    const buckets = successionWindow({ mastered: AT_TRIGGER });
    const eligible = successionEligibleNodes(buckets);

    for (let cycle = 1; cycle <= LONGEST_ENCOUNTER; cycle += 1) {
      const order = successionSkillOrder({
        buckets,
        encounterSeed: successionEncounterSeed(1),
        cycle,
      });
      // Every eligible node is offered, so a preferred skill the pool cannot serve costs a
      // reorder rather than a refused cycle.
      expect([...new Set(order)].sort(), `cycle ${cycle}`).toEqual([...eligible].sort());
      // And the first slots are the apportionment's, era for era.
      const slots = successionWindowSlots({ buckets, cycle });
      for (const [index, era] of slots.entries()) {
        const nodeId = order[index] as string;
        expect(
          (buckets.find((bucket) => bucket.era === era) as SuccessionWindowBucket).node_ids,
          `cycle ${cycle} slot ${index} should come from ${era}`,
        ).toContain(nodeId);
      }
    }
  });

  it("still fills a batch from a window one of whose buckets can serve nothing", () => {
    const partly: readonly SuccessionWindowBucket[] = [
      { era: "classical", eras_back: 0, share: 60, node_ids: [] },
      {
        era: "bronze_age",
        eras_back: 1,
        share: 40,
        node_ids: getEraOrThrow("bronze_age").nodes,
      },
    ];
    const servable = new Set(partly.flatMap((bucket) => bucket.node_ids));

    for (let cycle = 1; cycle <= LONGEST_ENCOUNTER; cycle += 1) {
      const order = successionSkillOrder({
        buckets: partly,
        encounterSeed: successionEncounterSeed(1),
        cycle,
      });
      expect(order.length, `cycle ${cycle} cannot fill a batch`).toBeGreaterThanOrEqual(
        SUCCESSION.cycle.batch_size,
      );
      for (const nodeId of order) {
        expect(servable, `cycle ${cycle} named ${nodeId}, which is in no bucket`).toContain(
          nodeId,
        );
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* The apportionment                                                          */
/* -------------------------------------------------------------------------- */

describe("the apportionment holds the ruled mix at every prefix", () => {
  /**
   * THE DEFINING PROPERTY, and the bound is one whole question: after `n` questions every
   * bucket holds its ruled share of `n`, rounded to a question.
   *
   * The margin is asserted in both directions. Under one, because that is the claim; and
   * strictly above zero, because 40/35/25 does not divide into three and a bound that was
   * never approached would be an exact division wearing an approximation's clothes.
   */
  it("keeps every bucket within one question of its share, and the bound is not free", () => {
    const buckets = successionWindow({ mastered: AT_TRIGGER });
    const sequence = eraSequence(buckets);

    expect(sequence.length).toBe(LONGEST_ENCOUNTER * SUCCESSION.cycle.batch_size);

    let worst = 0;
    const breaches: string[] = [];
    for (let asked = 1; asked <= sequence.length; asked += 1) {
      for (const bucket of buckets) {
        const taken = sequence.slice(0, asked).filter((era) => era === bucket.era).length;
        const owed = (bucket.share * asked) / 100;
        const error = Math.abs(taken - owed);
        worst = Math.max(worst, error);
        if (error >= 1) {
          breaches.push(`${bucket.era} at ${asked}: has ${taken}, owed ${owed.toFixed(2)}`);
        }
      }
    }

    expect(breaches).toEqual([]);
    // Measured at 0.60 of a question. Above zero, so the bound is a real approximation.
    expect(worst).toBeGreaterThan(0);
    expect(worst).toBeLessThan(1);
  });

  /**
   * §5.15's whole reason for bucket-first, in era four's own numbers: a uniform draw across
   * the window's nodes would hand era four's chapter 3 of 13, which is 23%, against a ruled
   * 40%. The gap is asserted with a margin rather than as an inequality that a rounding
   * error could satisfy.
   */
  it("gives the current era far more than a uniform draw across the window would", () => {
    const buckets = successionWindow({ mastered: AT_TRIGGER });
    const sequence = eraSequence(buckets);
    const eligible = successionEligibleNodes(buckets);

    const realised = sequence.filter((era) => era === "classical").length / sequence.length;
    const uniform = bucketAt(buckets, 0).node_ids.length / eligible.length;

    // The uniform figure really is the low one the ruling exists to prevent.
    expect(uniform).toBeLessThan(0.25);
    // And the apportioned draw beats it by a wide margin. 0.15 is a margin the measured gap
    // (0.429 against 0.231, so 0.198) clears and a uniform apportionment could not: it would
    // put the two sides equal.
    expect(realised).toBeGreaterThan(uniform + 0.15);
    // Within a question of the ruled share of the whole encounter, from the other side.
    expect(Math.abs(realised - 0.4)).toBeLessThan(1 / sequence.length);
  });

  /**
   * The tie-break, on a CONSTRUCTED window, and the reason is worth recording: era four's own
   * 40/35/25 never ties at the top inside an encounter — measured over the 21 questions of
   * the longest board — so a tie asserted on the shipped shares would be a decorative
   * assertion over an unreachable state. Two buckets at 50 tie on the first question, and the
   * ruling's direction is the chapter the player is standing in.
   */
  it("settles a tie in favour of the chapter the player is standing in", () => {
    const tied: readonly SuccessionWindowBucket[] = [
      { era: "classical", eras_back: 0, share: 50, node_ids: ["POL.1"] },
      { era: "bronze_age", eras_back: 1, share: 50, node_ids: ["LIN.1"] },
    ];

    const slots = successionWindowSlots({ buckets: tied, cycle: 1 });
    expect(slots[0]).toBe("classical");
    // And the tie is real rather than an order accident: both shares are equal, and over a
    // batch the two split it.
    expect(slots.filter((era) => era === "classical").length).toBeGreaterThanOrEqual(1);
    expect(slots.filter((era) => era === "bronze_age").length).toBeGreaterThanOrEqual(1);
  });

  it("is a pure function of the cycle, and refuses a cycle that is not one", () => {
    const buckets = successionWindow({ mastered: AT_TRIGGER });

    expect(successionWindowSlots({ buckets, cycle: 3 })).toEqual(
      successionWindowSlots({ buckets, cycle: 3 }),
    );
    // Different cycles really do differ, so determinism is not constancy.
    const perCycle = new Set(
      Array.from({ length: LONGEST_ENCOUNTER }, (_value, index) =>
        successionWindowSlots({ buckets, cycle: index + 1 }).join(","),
      ),
    );
    expect(perCycle.size).toBeGreaterThan(1);

    expect(() => successionWindowSlots({ buckets, cycle: 0 })).toThrow(/whole number/);
    expect(() => successionWindowSlots({ buckets, cycle: 1.5 })).toThrow(/whole number/);
    expect(() => successionEncounterSeed(0)).toThrow(/whole number/);
  });

  /**
   * INV-CRISIS-3 and INV-CRISIS-9 meeting a learner who skipped an era. A bucket with nothing
   * in it must not be allocated a slot it would have to hand back, so it leaves the
   * apportionment and the crisis is still playable — on a narrower mix, which is the price,
   * and never on a short batch, which is not available.
   */
  it("drops a bucket the learner cannot fill rather than refusing the cycle", () => {
    const onlyCurrent = CURRENT_AT_TRIGGER;
    const buckets = successionWindow({ mastered: onlyCurrent });

    // The window still names three eras; two of them can serve nothing.
    expect(buckets.length).toBe(SUCCESSION.window.eras_back + 1);
    expect(buckets.filter((bucket) => bucket.node_ids.length > 0).length).toBe(1);

    expect(new Set(eraSequence(buckets))).toEqual(new Set(["classical"]));

    const batch = batchFor(1, 1, onlyCurrent, pool(onlyCurrent));
    expect(batch.status).toBe("ready");
    if (batch.status !== "ready") {
      return;
    }
    expect(batch.prompts).toHaveLength(SUCCESSION.cycle.batch_size);
    for (const prompt of batch.prompts) {
      expect(onlyCurrent).toContain(prompt.node_id);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* D-CRISIS-15                                                                */
/* -------------------------------------------------------------------------- */

describe("D-CRISIS-15: no skill is re-asked while another in its bucket is untouched", () => {
  /**
   * The ruling, per bucket, because that is the population it can be true of: the mix decides
   * which era a question comes from and the bag decides which skill inside it, so the
   * coverage claim is about each bucket's own sequence.
   *
   * Asserted as an EQUALITY over the first `n` draws rather than as coverage, which is the
   * bag's defining property: one bag over the flattened window would let a bucket spend its
   * skills early and then be unable to honour its later slots.
   */
  it("asks every skill of a bucket before any of that bucket's skills repeats", () => {
    const buckets = successionWindow({ mastered: AT_TRIGGER });

    for (const bucket of buckets) {
      const drawn = skillsFromBucket(buckets, bucket.era, 1);
      const size = bucket.node_ids.length;
      // The floor: the encounter really does reach this bucket often enough to fill one bag.
      expect(drawn.length, `${bucket.era} was barely asked`).toBeGreaterThanOrEqual(size);
      expect([...drawn.slice(0, size)].sort(), bucket.era).toEqual(
        [...bucket.node_ids].sort(),
      );
    }
  });

  /** The boundary swap: nothing lands back to back, including across a bag's seam. */
  it("never asks one bucket for the same skill twice running, over 40 encounters", () => {
    const buckets = successionWindow({ mastered: AT_TRIGGER });
    const repeats: string[] = [];

    for (let encounter = 1; encounter <= 40; encounter += 1) {
      for (const bucket of buckets) {
        const drawn = skillsFromBucket(buckets, bucket.era, encounter);
        for (let index = 1; index < drawn.length; index += 1) {
          if (drawn[index] === drawn[index - 1]) {
            repeats.push(`${bucket.era} in encounter ${encounter}: ${drawn[index]} twice`);
          }
        }
      }
    }

    expect(repeats).toEqual([]);
  });

  /**
   * THE DEFECT ERA ONE HAD, which is why this is asserted over an encounter rather than a
   * batch. A draw that stops the moment it has `batch_size` can only ever reach the first
   * `batch_size` entries of the order it was handed, so with thirteen eligible nodes and a
   * batch of three, ten skills were unreachable at every seed.
   */
  it("reaches every eligible node inside one encounter, at 40 seeds", () => {
    const missing: string[] = [];
    const eligible = successionEligibleNodes(successionWindow({ mastered: AT_TRIGGER }));

    for (let encounter = 1; encounter <= 40; encounter += 1) {
      const asked = new Set<string>();
      for (let cycle = 1; cycle <= LONGEST_ENCOUNTER; cycle += 1) {
        const batch = batchFor(cycle, encounter);
        if (batch.status !== "ready") {
          throw new Error(batch.message);
        }
        for (const prompt of batch.prompts) {
          asked.add(prompt.node_id);
        }
      }
      for (const nodeId of eligible) {
        if (!asked.has(nodeId)) {
          missing.push(`${nodeId} in encounter ${encounter}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  /** Replayable, which INV-CRISIS-11 requires of every part of the encounter. */
  it("is a pure function of the encounter seed and the cycle", () => {
    const buckets = successionWindow({ mastered: AT_TRIGGER });
    const encounterSeed = successionEncounterSeed(7);

    for (let cycle = 1; cycle <= LONGEST_ENCOUNTER; cycle += 1) {
      expect(successionSkillOrder({ buckets, encounterSeed, cycle })).toEqual(
        successionSkillOrder({ buckets, encounterSeed, cycle }),
      );
    }

    // Different encounters really do differ, so determinism is not constancy — and the
    // difference has to come from the ENCOUNTER seed rather than from the cycle, or a rule
    // about the sequence of cycles could not be expressed at all.
    const orders = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((encounter) =>
        successionSkillOrder({
          buckets,
          encounterSeed: successionEncounterSeed(encounter),
          cycle: 1,
        })
          .slice(0, SUCCESSION.cycle.batch_size)
          .join(","),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });
});

/* -------------------------------------------------------------------------- */
/* The batch, or a refusal                                                    */
/* -------------------------------------------------------------------------- */

describe("a full batch or a refusal, and no third outcome", () => {
  it("asks batch_size questions at every window shape a learner can present", () => {
    const eligible = successionEligibleNodes(successionWindow({ mastered: AT_TRIGGER }));

    for (let count = 1; count <= eligible.length; count += 1) {
      const mastered = eligible.slice(0, count);
      for (let cycle = 1; cycle <= LONGEST_ENCOUNTER; cycle += 1) {
        const batch = batchFor(cycle, 1, mastered, pool(mastered));
        if (batch.status !== "ready") {
          throw new Error(`${count} node(s), cycle ${cycle}: ${batch.message}`);
        }
        expect(batch.prompts, `${count} node(s), cycle ${cycle}`).toHaveLength(
          SUCCESSION.cycle.batch_size,
        );
        expect(batch.size).toBe(SUCCESSION.cycle.batch_size);
      }
    }
  });

  /**
   * Swept from a one-node window upward, because the WIDE case cannot fail: with thirteen
   * nodes eligible and a batch of three, the round-robin's first pass takes one item from each
   * of three different skills and a repeated item is unreachable. The narrow window is where
   * one skill has to fill the whole batch, and it is the case a draw that peeked instead of
   * taking would break.
   */
  it("never repeats an item inside one batch, down to a one-skill window", () => {
    const eligible = successionEligibleNodes(successionWindow({ mastered: AT_TRIGGER }));

    for (let count = 1; count <= eligible.length; count += 1) {
      const mastered = eligible.slice(0, count);
      for (let encounter = 1; encounter <= 10; encounter += 1) {
        for (let cycle = 1; cycle <= LONGEST_ENCOUNTER; cycle += 1) {
          const batch = batchFor(cycle, encounter, mastered, pool(mastered));
          if (batch.status !== "ready") {
            throw new Error(batch.message);
          }
          const ids = batch.prompts.map((prompt) => prompt.item_version_id);
          expect(new Set(ids).size, `${count} node(s), cycle ${cycle}`).toBe(ids.length);
        }
      }
    }
  });

  /**
   * Two halves, and the second is the one that discriminates. With a pool that can serve the
   * window, no prompt comes from outside it — but that would also be true of a draw that
   * simply never got that far. So the second half hands over a pool that is RICH outside the
   * window and thin inside it, and the correct answer is a REFUSAL: era five's questions
   * cannot fill era four's batch, however many of them there are.
   */
  it("draws only from the window, and refuses rather than reaching outside it", () => {
    const mastered = [...CURRENT_AT_TRIGGER, ...getEraOrThrow("bronze_age").nodes];
    const outside = getEraOrThrow("medieval").nodes;
    const wider = pool([...mastered, ...outside]);

    for (let cycle = 1; cycle <= LONGEST_ENCOUNTER; cycle += 1) {
      const batch = batchFor(cycle, 1, mastered, wider);
      if (batch.status !== "ready") {
        throw new Error(batch.message);
      }
      for (const prompt of batch.prompts) {
        expect(mastered, `${prompt.node_id} is outside the window`).toContain(
          prompt.node_id,
        );
      }
    }

    // A pool of era five's questions, plus one lone question from the window: the batch cannot
    // be filled from inside the window, and outside it is not an option.
    const lopsided = [
      ...pool(outside),
      ...pool([CURRENT_AT_TRIGGER[0] as string]).slice(0, 1),
    ];
    expect(lopsided.length).toBeGreaterThan(SUCCESSION.cycle.batch_size * 4);

    const refused = batchFor(1, 1, mastered, lopsided);
    expect(refused.status).toBe("unavailable");
    if (refused.status !== "unavailable") {
      return;
    }
    expect(refused.reason).toBe("pool_too_thin");
    expect(refused.available).toBe(1);
  });

  it("refuses when the learner has finished nothing in the window, and says why", () => {
    const batch = batchFor(1, 1, [], pool(AT_TRIGGER));

    expect(batch.status).toBe("unavailable");
    if (batch.status !== "unavailable") {
      return;
    }
    expect(batch.reason).toBe("nothing_mastered");
    expect(batch.available).toBe(0);
    expect(batch.wanted).toBe(SUCCESSION.cycle.batch_size);
  });

  /**
   * INV-CRISIS-9 in era four's terms, and the reason is the inverse of era one's: a short
   * batch here would make the crisis HARDER, because one district decides per cycle whatever
   * the batch was.
   */
  it("refuses a pool too thin rather than serving a short batch", () => {
    const thin = pool(AT_TRIGGER).slice(0, SUCCESSION.cycle.batch_size - 1);
    const batch = batchFor(1, 1, AT_TRIGGER, thin);

    expect(batch.status).toBe("unavailable");
    if (batch.status !== "unavailable") {
      return;
    }
    expect(batch.reason).toBe("pool_too_thin");
    expect(batch.available).toBe(thin.length);
    expect(batch.available).toBeLessThan(SUCCESSION.cycle.batch_size);
    expect(batch.message).toMatch(/harder/);
  });

  it("labels every prompt with the era of the window it came from", () => {
    const buckets = successionWindow({ mastered: AT_TRIGGER });
    const eraOf = new Map<string, EraId>();
    for (const bucket of buckets) {
      for (const nodeId of bucket.node_ids) {
        eraOf.set(nodeId, bucket.era);
      }
    }

    const seen = new Set<EraId>();
    for (let cycle = 1; cycle <= LONGEST_ENCOUNTER; cycle += 1) {
      const batch = batchFor(cycle);
      if (batch.status !== "ready") {
        throw new Error(batch.message);
      }
      for (const prompt of batch.prompts) {
        expect(prompt.era, prompt.node_id).toBe(eraOf.get(prompt.node_id));
        seen.add(prompt.era);
      }
    }
    // A floor and a composition: all three chapters really were labelled, so this is not
    // passing because everything carries the crisis's own era.
    expect([...seen].sort()).toEqual(["bronze_age", "classical", "neolithic"]);
  });

  /**
   * **THE ITEM STREAM IS SEEDED PER CYCLE, and this is the assertion that says so.** The skill
   * order is seeded on the ENCOUNTER, because a rule about the sequence of cycles cannot be
   * expressed by a per-cycle seed; the item drawn inside a skill is seeded per CYCLE, so two
   * cycles that ask the same skill still ask different questions. Nothing else in this suite
   * separates those two axes: a batch signature differs between cycles either way, because the
   * skill differs.
   *
   * Swept over a fixed set of seeds rather than sampled, so it is reproducible: with the item
   * stream seeded on the encounter alone, every repeat of a skill inside an encounter asks the
   * identical question, deterministically.
   */
  it("asks a different question when one encounter comes back to the same skill", () => {
    // A window of ONE skill, which is what isolates the two axes: every cycle's order is the
    // same single node, so the only thing that can make two cycles differ is the item stream.
    const one = [CURRENT_AT_TRIGGER[0] as string];
    const deep = pool(one);

    const signatures = new Map<string, number[]>();
    for (let cycle = 1; cycle <= LONGEST_ENCOUNTER; cycle += 1) {
      const batch = batchFor(cycle, 1, one, deep);
      if (batch.status !== "ready") {
        throw new Error(batch.message);
      }
      for (const prompt of batch.prompts) {
        expect(prompt.node_id).toBe(one[0]);
      }
      const signature = batch.prompts.map((prompt) => prompt.item_version_id).join(",");
      signatures.set(signature, [...(signatures.get(signature) ?? []), cycle]);
    }

    // Every cycle asked a different three, so the stream is a function of the cycle and not
    // only of the encounter. Seeded on the encounter alone these would all be one entry.
    const shared = [...signatures.entries()].filter(([, cycles]) => cycles.length > 1);
    expect(
      shared.map(([signature, cycles]) => `${signature} at ${cycles.join("/")}`),
    ).toEqual([]);
    expect(signatures.size).toBe(LONGEST_ENCOUNTER);
  });

  it("is deterministic in the encounter and the cycle, and varies over both", () => {
    expect(batchFor(3, 2)).toEqual(batchFor(3, 2));

    const signatures = new Set<string>();
    for (let encounter = 1; encounter <= 4; encounter += 1) {
      for (let cycle = 1; cycle <= LONGEST_ENCOUNTER; cycle += 1) {
        const batch = batchFor(cycle, encounter);
        if (batch.status !== "ready") {
          throw new Error(batch.message);
        }
        signatures.add(batch.prompts.map((prompt) => prompt.item_version_id).join(","));
      }
    }
    // Every (encounter, cycle) pair asked something different, so no two batches in a
    // four-encounter sweep are the same three questions.
    expect(signatures.size).toBe(4 * LONGEST_ENCOUNTER);
  });

  /**
   * A PREFERENCE AND NEVER A CONSTRAINT. Driven with a pool that can serve only two of the
   * window's thirteen nodes, so the order has to be overridden for the cycle to happen at
   * all. A hard constraint would refuse here, and INV-CRISIS-3 forbids that.
   */
  it("serves a full batch when the preferred skills can serve nothing", () => {
    const servable = [CURRENT_AT_TRIGGER[0] as string, "RAD.4"];
    const thin = pool(servable);
    const buckets = successionWindow({ mastered: AT_TRIGGER });

    for (let cycle = 1; cycle <= LONGEST_ENCOUNTER; cycle += 1) {
      const order = successionSkillOrder({
        buckets,
        encounterSeed: successionEncounterSeed(1),
        cycle,
      });
      const batch = composeSuccessionBatch(buckets, thin, {
        rng: () => 0.5,
        skill_order: order,
      });
      expect(batch.status, `cycle ${cycle} refused a servable pool`).toBe("ready");
      if (batch.status !== "ready") {
        return;
      }
      expect(batch.prompts).toHaveLength(SUCCESSION.cycle.batch_size);
      // The floor: it really did fall back, rather than the order happening to name a
      // servable skill first.
      for (const prompt of batch.prompts) {
        expect(servable).toContain(prompt.node_id);
      }
    }

    // And the extreme of the same rule, stated on its own because the cycles above may happen
    // to prefer a servable skill: an order that names NOTHING the pool can serve still yields
    // a full batch. A hard constraint returns nothing here.
    const hopeless = composeSuccessionBatch(buckets, thin, {
      rng: () => 0.5,
      skill_order: successionEligibleNodes(buckets).filter(
        (nodeId) => !servable.includes(nodeId),
      ),
    });
    expect(hopeless.status).toBe("ready");
    if (hopeless.status !== "ready") {
      return;
    }
    expect(hopeless.prompts).toHaveLength(SUCCESSION.cycle.batch_size);
  });
});

/* -------------------------------------------------------------------------- */
/* The batch and the reducer, on one wire                                     */
/* -------------------------------------------------------------------------- */

describe("the batch and the civil-war reducer on one wire", () => {
  /**
   * **THE FAIRNESS PROPERTY THE COMPOSER COULD BREAK, asserted through the composer rather
   * than beside it.** A perfect batch mints exactly what a sway costs, so a player who reads
   * the drift line has one whole cycle and exactly the price of answering it. That identity
   * is a fact about the tuning table AND about the batch that reaches the reducer: a composer
   * that served two questions would mint at most two counters against a sway's three, and the
   * warning would stop being answerable.
   */
  it("mints one decisive rally from a perfect composed batch", () => {
    const batch = batchFor(1);
    expect(batch.status).toBe("ready");
    if (batch.status !== "ready") {
      return;
    }

    let state = createSuccession();
    state = successionReducer(state, { type: "start_batch" });
    state = successionReducer(state, {
      type: "resolve_batch",
      correct: batch.prompts.length,
      asked: batch.prompts.length,
    });

    expect(state.influence).toBe(SUCCESSION.influence_by_correct[3]);
    expect(successionActionOffers(state).map((offer) => offer.kind)).toEqual([
      "rally",
      "reopen",
    ]);

    state = successionReducer(state, { type: "propose_action", kind: "rally" });
    state = successionReducer(state, { type: "commit_action" });

    expect(state.influence).toBe(0);
    expect(successionActionOffers(state)).toEqual([]);
    expect(
      state.districts.filter((district) => district.control === "player"),
    ).toHaveLength(1);
    expect(
      state.districts.filter((district) => district.civic_state === "closed"),
    ).toHaveLength(1);
  });

  /**
   * And every batch the composer serves is a size the reducer will close a cycle on, over a
   * whole encounter. The reducer throws on any other size, so this is the two refusals
   * agreeing rather than one of them being redundant.
   */
  it("serves a size the reducer closes a cycle on, for every cycle of an encounter", () => {
    let state = createSuccession();
    let served = 0;

    while (state.phase !== "settled" && served < LONGEST_ENCOUNTER + 2) {
      const batch = batchFor(state.batch + 1);
      if (batch.status !== "ready") {
        throw new Error(batch.message);
      }
      served += 1;
      state = successionReducer(state, { type: "start_batch" });
      state = successionReducer(state, {
        type: "resolve_batch",
        correct: 0,
        asked: batch.prompts.length,
      });
      state = successionReducer(state, { type: "finish_response" });
    }

    expect(state.phase).toBe("settled");
    expect(served).toBe(state.batch_log.length);
    expect(served).toBeGreaterThanOrEqual(2);
  });
});
