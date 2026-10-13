import { ERA_SEQUENCE, type EraId, eraNumber, getEraOrThrow } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  eraFires,
  eraPassedCount,
  eraPlacementFromSeed,
  seedPlacingAtEra,
} from "./eraPlacement";

/**
 * WHAT THIS FILE IS FOR, and it is one claim above all the others: **the era decision reads
 * the SHAPE of a placement and never its scope.**
 *
 * `.cursor/rules/qa-verification.mdc` asks that a guard's population be defined by who
 * exhibits the behaviour rather than by where it is implemented, and asks for a floor under
 * a derived population so containment cannot hold trivially. Every population below is
 * `ERA_SEQUENCE` itself with a floor of `ERA_SEQUENCE.length`, and the floor is the reason
 * the file is worth reading: a sweep over the eras is exactly as strong as its guarantee
 * that it swept more than zero of them.
 *
 * The scope-independence claim matters because the diagnostic is being widened in another
 * lane right now. A guard that pinned six nodes would go green today and would have to be
 * rewritten on the day the widening lands, which is precisely when a guard is most needed.
 */

/** Everything the diagnostic would have to pass for `count` whole ages to fire. */
function passingThrough(count: number): Record<string, number> {
  const seed: Record<string, number> = {};
  for (const era of ERA_SEQUENCE.slice(0, count)) {
    for (const nodeId of era.nodes) {
      seed[nodeId] = 2;
    }
  }
  return seed;
}

describe("the era decision is a conjunction over the era's own nodes", () => {
  it("fires only when every node of the era passed, swept over every authored era", () => {
    // POPULATION: the authored sequence, derived. FLOOR: it is not empty, so the sweep
    // below cannot be a vacuous `every` over nothing.
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);

    for (const era of ERA_SEQUENCE) {
      const whole = passingThrough(eraNumber(era.id));
      expect(eraFires(era.id, whole)).toBe(true);

      // One node short is the whole finding: the conjunction is what makes the decision
      // fail-closed, so dropping any single node has to close it. Swept per node rather
      // than at one arbitrary node, because "some node closes it" is a weaker claim.
      for (const nodeId of era.nodes) {
        const short = { ...whole, [nodeId]: 1 };
        expect(eraFires(era.id, short)).toBe(false);
      }
    }
  });

  it("does not fire on an era the instrument never probed, which is the widening seam", () => {
    // An empty seed is what today's D1-only walk hands every era but the first, and it is
    // what a widened walk would hand an era whose items are not authored yet. Absent must
    // read as not-passed at every era or the catch-up hands over ages on no evidence.
    for (const era of ERA_SEQUENCE) {
      expect(eraFires(era.id, {})).toBe(false);
      expect(eraPassedCount(era.id, {})).toBe(0);
    }
  });

  it("counts partial evidence without letting it fire", () => {
    const era = ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number];
    const firstNode = era.nodes[0] as string;
    const partial = { [firstNode]: 3 };
    expect(eraPassedCount(era.id, partial)).toBe(1);
    expect(eraFires(era.id, partial)).toBe(era.nodes.length === 1);
  });
});

describe("the placed age and the handed-over prefix", () => {
  it("places the learner in the first age that did not fire, at every cut", () => {
    // POPULATION: every possible number of cleared ages, 0 through the whole sequence.
    // FLOOR: the sequence is not empty (asserted above), so this loop runs.
    for (let cleared = 0; cleared < ERA_SEQUENCE.length; cleared += 1) {
      const placement = eraPlacementFromSeed(passingThrough(cleared));
      expect(placement.skipped).toEqual(ERA_SEQUENCE.slice(0, cleared).map((e) => e.id));
      expect(placement.placedEra).toBe(ERA_SEQUENCE[cleared]?.id);
      expect(placement.clearedEverything).toBe(false);
    }
  });

  it("takes the CONTIGUOUS run when the learner's knowledge is not a prefix", () => {
    // D-ERA17: "a student's knowledge may not be a prefix of the sequence." Era one and
    // era three fire; era two does not. §10.9 rules the handed set is a prefix anyway,
    // because one founding cannot express a gap, so era three is TAUGHT rather than
    // handed over. This is the assertion that says the gap is not silently skipped.
    const one = ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number];
    const three = ERA_SEQUENCE[2] as (typeof ERA_SEQUENCE)[number];
    const seed: Record<string, number> = {};
    for (const nodeId of [...one.nodes, ...three.nodes]) {
      seed[nodeId] = 2;
    }

    const placement = eraPlacementFromSeed(seed);
    expect(placement.skipped).toEqual([one.id]);
    expect(placement.placedEra).toBe(ERA_SEQUENCE[1]?.id);
    expect(placement.skipped).not.toContain(three.id);
  });

  it("hands nothing over when nothing fired, which is today's ordinary answer", () => {
    const placement = eraPlacementFromSeed({});
    expect(placement.skipped).toEqual([]);
    expect(placement.placedEra).toBe(ERA_SEQUENCE[0]?.id);
  });

  it("stands the learner in the LAST age when every age fired", () => {
    const last = ERA_SEQUENCE[ERA_SEQUENCE.length - 1] as (typeof ERA_SEQUENCE)[number];
    const placement = eraPlacementFromSeed(passingThrough(ERA_SEQUENCE.length));
    expect(placement.clearedEverything).toBe(true);
    expect(placement.placedEra).toBe(last.id);
    expect(placement.skipped).toHaveLength(ERA_SEQUENCE.length - 1);
    expect(placement.skipped).not.toContain(last.id);
  });
});

describe("seedPlacingAtEra is the demo's entry point and round-trips", () => {
  it("round-trips through the real reader for every authored age", () => {
    // POPULATION: every era, derived, floored. This is the assertion the dev affordance
    // and the demo script both rest on: asking for an age is the same thing as being
    // placed in it.
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    const seen: EraId[] = [];
    for (const era of ERA_SEQUENCE) {
      const placement = eraPlacementFromSeed(seedPlacingAtEra(era.id));
      expect(placement.placedEra).toBe(era.id);
      expect(placement.skipped).toHaveLength(eraNumber(era.id) - 1);
      seen.push(era.id);
    }
    // COMPOSITION, not just size: the sweep covered the authored sequence exactly, so it
    // cannot drift to ten of something else.
    expect(seen).toEqual(ERA_SEQUENCE.map((era) => era.id));
  });

  it("leaves an unprobed node ABSENT rather than writing a zero", () => {
    // The reader has to be correct about absence (that is the widening seam), so the seed
    // must exercise it rather than paper over it with explicit zeros.
    const second = ERA_SEQUENCE[1] as (typeof ERA_SEQUENCE)[number];
    const seed = seedPlacingAtEra(second.id);
    for (const nodeId of second.nodes) {
      expect(Object.hasOwn(seed, nodeId)).toBe(false);
    }
    for (const nodeId of getEraOrThrow(ERA_SEQUENCE[0]?.id as EraId).nodes) {
      expect(seed[nodeId]).toBe(2);
    }
  });

  it("writes the WEAKER passing grade, so the unlock boundary is the one exercised", () => {
    // 2 is a measured-non-robust or graph-inferred pass and is exactly the unlock rule's
    // bar. Seeding 3 would clear the bar with a margin and would stop testing it.
    const seed = seedPlacingAtEra(ERA_SEQUENCE[1]?.id as EraId);
    expect(new Set(Object.values(seed))).toEqual(new Set([2]));
  });
});
