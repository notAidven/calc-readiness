import { ERA_SEQUENCE } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { createSeededRng, mixSeed } from "./citizens-rng";
import {
  composeHardWinterBatch,
  hardWinterIsland,
  type WinterBatchCandidate,
  winterSkillOrder,
} from "./hard-winter";
import { HARD_WINTER } from "./hard-winter-tuning";

/**
 * WHICH QUESTIONS THE CRISIS CAN ASK — D-CRISIS-14's window and D-CRISIS-15's no-repeat rule.
 *
 * The defect these guards were written for: the round-robin took the eligible nodes in the
 * caller's array order and stopped the moment it had `batch_size`, so **only the first
 * `batch_size` entries could ever be drawn**. Measured before the fix, over 240 seeded
 * batches with six nodes eligible: three nodes reached, three unreachable at every seed.
 * The entry advisor tells the player the questions come from lessons they have already done,
 * and that was true only by the coincidence that the trigger leaves exactly three mastered.
 *
 * These are the ENGINE's half. `apps/web/src/winter/crisisQuestionPool.test.ts` owns the
 * half that is about a real learner's progress, because that is where progress lives.
 */

/** Six nodes, six items each: era one's shape, without depending on the authored bank. */
const NODES = ["N1", "N2", "N3", "N4", "N5", "N6"] as const;
const ITEMS_PER_NODE = 6;

function pool(nodes: readonly string[] = NODES): WinterBatchCandidate[] {
  const out: WinterBatchCandidate[] = [];
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

/** The surface's own seeding, so these guards measure the shipped stream. */
function roundRng(encounter: number, round: number): () => number {
  return createSeededRng(mixSeed(encounter * 1000 + round, 0x5eed));
}

function encounterSeed(encounter: number): number {
  return mixSeed(encounter, 0x5eed);
}

/** One round exactly as `winterBatchFor` composes it. */
function batchFor(
  eligible: readonly string[],
  encounter: number,
  round: number,
  candidates: readonly WinterBatchCandidate[] = pool(),
) {
  return composeHardWinterBatch(eligible, candidates, {
    rng: roundRng(encounter, round),
    skill_order: winterSkillOrder({
      eligible,
      encounterSeed: encounterSeed(encounter),
      round,
    }),
  });
}

function nodesAsked(
  eligible: readonly string[],
  encounters: number,
  rounds: number,
): Set<string> {
  const seen = new Set<string>();
  for (let encounter = 1; encounter <= encounters; encounter += 1) {
    for (let round = 1; round <= rounds; round += 1) {
      const batch = batchFor(eligible, encounter, round);
      if (batch.status !== "ready") {
        throw new Error(batch.message);
      }
      for (const prompt of batch.prompts) {
        seen.add(prompt.node_id);
      }
    }
  }
  return seen;
}

describe("every eligible skill can actually be asked", () => {
  /**
   * THE GUARD THE DEFECT NEEDED, and it names the fourth node because that is the first one
   * the truncation could never reach: `batch_size` is 3, so entries 4, 5 and 6 of the list
   * were unreachable at every seed.
   *
   * A whole ENCOUNTER, not a single batch, because a batch of three cannot touch six skills
   * and asking it to would be asserting the wrong thing.
   */
  it("reaches the fourth node and every node after it, inside one encounter", () => {
    const asked = nodesAsked(NODES, 1, HARD_WINTER.rounds);

    // Named individually rather than by count, because a count is satisfied by any six and
    // the claim is about these three in particular.
    expect(asked.has("N4"), "the fourth eligible node was never asked").toBe(true);
    expect(asked.has("N5"), "the fifth eligible node was never asked").toBe(true);
    expect(asked.has("N6"), "the sixth eligible node was never asked").toBe(true);
    expect([...asked].sort()).toEqual([...NODES].sort());
  });

  /**
   * And it is not a property of one seed. Swept over 40 encounters so a fix that merely
   * reordered the list into a luckier arrangement could not pass.
   */
  it("reaches every eligible node in every one of 40 seeded encounters", () => {
    const missing: string[] = [];
    for (let encounter = 1; encounter <= 40; encounter += 1) {
      const asked = nodesAsked(NODES, 1, HARD_WINTER.rounds);
      for (const node of NODES) {
        if (!asked.has(node)) {
          missing.push(`${node} in encounter ${encounter}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  /**
   * The composer without a `skill_order` is the fallback path, and it has to reach every node
   * too: that is what makes forgetting to pass the order a loss of fairness rather than a
   * return of the truncation. The old code shuffled each node's ITEMS and never the node
   * order, which is exactly why the bug was invisible to a seed sweep.
   */
  it("reaches every eligible node with no skill order at all, on the shuffle alone", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed += 1) {
      const batch = composeHardWinterBatch(NODES, pool(), {
        rng: createSeededRng(mixSeed(seed, 0xbead)),
      });
      if (batch.status !== "ready") {
        throw new Error(batch.message);
      }
      for (const prompt of batch.prompts) {
        seen.add(prompt.node_id);
      }
    }
    expect([...seen].sort()).toEqual([...NODES].sort());
  });
});

describe("D-CRISIS-15: a skill is not re-asked while another goes untouched", () => {
  /**
   * The ruling in its own terms, over the encounter it governs. Six eligible nodes and
   * `batch_size` 3 means the first two rounds are exactly one cycle, so after two rounds
   * every skill has been asked exactly once and none twice. That is the bag's defining
   * property and it is asserted as an equality rather than as coverage.
   */
  it("asks every eligible skill once before any is asked twice", () => {
    const counts = new Map<string, number>();
    const perCycle = Math.ceil(NODES.length / HARD_WINTER.batch_size);
    for (let round = 1; round <= perCycle; round += 1) {
      const batch = batchFor(NODES, 1, round);
      if (batch.status !== "ready") {
        throw new Error(batch.message);
      }
      for (const prompt of batch.prompts) {
        counts.set(prompt.node_id, (counts.get(prompt.node_id) ?? 0) + 1);
      }
    }
    expect([...counts.keys()].sort()).toEqual([...NODES].sort());
    expect([...counts.values()]).toEqual(NODES.map(() => 1));
  });

  /**
   * A PREFERENCE AND NEVER A CONSTRAINT, which D-CRISIS-15 requires in those words because
   * INV-CRISIS-9 refuses a short batch and INV-CRISIS-3 forbids an unplayable round.
   *
   * Driven with a pool where two of the three preferred skills can serve nothing at all, so
   * the preference has to be overridden for the round to happen. A hard constraint would
   * refuse here.
   */
  it("serves a full batch when the preferred skills are exhausted", () => {
    // Only N1 and N6 have items; the order will prefer skills that cannot serve.
    const thin = pool(["N1", "N6"]);
    for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
      const batch = batchFor(NODES, 1, round, thin);
      expect(batch.status, `round ${round} refused a servable pool`).toBe("ready");
      if (batch.status !== "ready") {
        return;
      }
      expect(batch.prompts).toHaveLength(HARD_WINTER.batch_size);
      // The floor: it really did fall back, so this is not passing because the order
      // happened to name a servable skill first.
      for (const prompt of batch.prompts) {
        expect(["N1", "N6"]).toContain(prompt.node_id);
      }
    }
  });

  /** The cycle boundary, the way `createInterleavedScheduler` handles it. */
  it("does not open a cycle on the skill the last one closed with", () => {
    for (let encounter = 1; encounter <= 40; encounter += 1) {
      // Two adjacent cycles read end to end, at a size that makes the boundary a seam
      // between rounds rather than inside one.
      const first = winterSkillOrder({
        eligible: NODES,
        encounterSeed: encounterSeed(encounter),
        round: 1,
        size: NODES.length,
      }).slice(0, NODES.length);
      const second = winterSkillOrder({
        eligible: NODES,
        encounterSeed: encounterSeed(encounter),
        round: 2,
        size: NODES.length,
      }).slice(0, NODES.length);
      expect(
        second[0],
        `encounter ${encounter} repeated a skill across the cycle boundary`,
      ).not.toBe(first[first.length - 1]);
      // And each cycle really is a permutation, so the boundary check is not comparing
      // two truncated lists.
      expect([...first].sort()).toEqual([...NODES].sort());
      expect([...second].sort()).toEqual([...NODES].sort());
    }
  });

  /** Replayable, which INV-CRISIS-11 requires of every part of the encounter. */
  it("is a pure function of the encounter seed and the round", () => {
    for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
      const once = winterSkillOrder({
        eligible: NODES,
        encounterSeed: encounterSeed(7),
        round,
      });
      const twice = winterSkillOrder({
        eligible: NODES,
        encounterSeed: encounterSeed(7),
        round,
      });
      expect(twice).toEqual(once);
    }
    // Different encounters really do differ, so determinism is not constancy.
    const orders = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((encounter) =>
        winterSkillOrder({
          eligible: NODES,
          encounterSeed: encounterSeed(encounter),
          round: 1,
        }).join(","),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe("a wider pool is not a longer round", () => {
  /**
   * `batch_size` is a tuning constant and the tier is a ratio of it, so more eligible skills
   * must change WHICH questions appear and never HOW MANY. Asserted across the whole ladder
   * of eligible-set sizes the fix opened up.
   */
  it("asks batch_size questions at every eligible-set size from 1 to 6", () => {
    for (let count = 1; count <= NODES.length; count += 1) {
      const eligible = NODES.slice(0, count);
      for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
        const batch = batchFor(eligible, 1, round);
        if (batch.status !== "ready") {
          throw new Error(`${count} node(s), round ${round}: ${batch.message}`);
        }
        expect(batch.prompts, `${count} node(s), round ${round}`).toHaveLength(
          HARD_WINTER.batch_size,
        );
        expect(batch.size).toBe(HARD_WINTER.batch_size);
      }
    }
  });

  /** And a batch never asks the same ITEM twice, which the round-robin already guaranteed. */
  it("never repeats an item inside one batch", () => {
    for (let encounter = 1; encounter <= 20; encounter += 1) {
      for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
        const batch = batchFor(NODES, encounter, round);
        if (batch.status !== "ready") {
          throw new Error(batch.message);
        }
        const ids = batch.prompts.map((prompt) => prompt.item_version_id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });
});

describe("the window, and the part of D-CRISIS-14 that is not implemented", () => {
  /**
   * The composer draws from the eligible set and from nothing else. That is the whole of
   * D-CRISIS-14's era-one exception — *"Hard Winter draws 100% from era one's own mastered
   * nodes"* — and it is the only part of the ruling a shipped crisis can exercise.
   */
  it("draws only from the eligible set, never from a node outside it", () => {
    const eligible = ["N1", "N2", "N4"];
    for (let encounter = 1; encounter <= 20; encounter += 1) {
      for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
        const batch = batchFor(eligible, encounter, round);
        if (batch.status !== "ready") {
          throw new Error(batch.message);
        }
        for (const prompt of batch.prompts) {
          expect(eligible, `${prompt.node_id} is outside the eligible set`).toContain(
            prompt.node_id,
          );
        }
      }
    }
  });

  /**
   * THE BUCKET WEIGHTS ARE NOT IMPLEMENTED, and this records why rather than leaving the
   * omission to be discovered.
   *
   * D-CRISIS-14's general form is a three-era window sampled bucket-first at 40/35/25. Era
   * one has no era behind it, which is why the ruling carries a **named era-one exception**
   * at 100% of its own mastered nodes and says the exception *"has to be written down rather
   * than derived"* — a general implementation hands era one a 60% share of nothing, yields a
   * short draw, and INV-CRISIS-9 then refuses it, so the only built crisis stops being
   * playable through a rounding path.
   *
   * So the shipped crisis needs the exception and nothing else.
   *
   * **⚑ THIS TRIPWIRE USED TO BE DERIVED FROM THE LAND, AND ITS SUBJECT HAS MOVED.** It read
   * *"has one era whose land is authored, so the buckets have nothing to weigh"*, and that was
   * a correct proxy while era one alone had an authored land budget: no second era had ground,
   * so no second era could host a crisis. All ten budgets are authored now (D-ERA25), so land
   * discriminates nothing and a guard derived from it would report green over ten eras while
   * meaning nothing at all, which is the failure mode `.cursor/rules/qa-verification.mdc`
   * names.
   *
   * The condition that actually makes the buckets owed is a second era with a question pool,
   * and this package cannot see one: the pool is `D1_PRACTICE_ITEMS`, an app-level import. So
   * **the tripwire moved to where its subject lives**, as a census over the real pool in
   * `apps/web/src/winter/crisisEra.test.tsx` (*"derives the content set from the real item
   * pool, so a second era's items fail here"*). What is left here is the structural half the
   * engine can still state, which is why the era-one exception exists at all.
   */
  it("has no era behind era one, which is why the era-one exception exists", () => {
    // Derived from the sequence rather than written down. Era one is FIRST, so the three-era
    // window has two empty buckets and a general 40/35/25 implementation would hand it a 60%
    // share of nothing, yield a short draw, and have INV-CRISIS-9 refuse it.
    expect(ERA_SEQUENCE[0]?.id).toBe("prehistoric");
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);

    // AND THE FENCE THAT USED TO STAND HERE IS GONE, asserted rather than left implicit: the
    // island builds for every era now, so nothing in this package stops the crisis being
    // pointed at an era with no questions in it.
    for (const era of ERA_SEQUENCE) {
      expect(() => hardWinterIsland(era.id), era.id).not.toThrow();
    }
    expect(ERA_SEQUENCE.filter((era) => era.land.status === "authored")).toHaveLength(
      ERA_SEQUENCE.length,
    );
  });
});
