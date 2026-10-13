import { ERA_MAX_NODES, ERA_MIN_NODES, ERA_SEQUENCE, getEraOrThrow } from "@cr/skill-graph";
import type { Mastery, StudentNodeState } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { ISLAND_UNLOCK_MASTERY_GATE } from "./island-unlock-exam";
import {
  CRISIS_MASTERY_GATE,
  crisisTriggerForNodeCount,
  midEraCrisisCall,
  midEraCrisisNodeIds,
  midEraCrisisTrigger,
} from "./mid-era-crisis";

/**
 * THE ENTRY CONDITION, AND THAT IT IS DERIVED RATHER THAN WRITTEN DOWN.
 *
 * The population here is `ERA_SEQUENCE` itself — every era the game ships, read from the
 * registry — and never a list transcribed into this file. A transcribed list is the
 * failure this repo keeps finding: it passes while covering a fraction of the tree, and
 * it goes on passing after the tree moves.
 *
 * ## What each block would catch
 *
 *  1. **`return 3`.** The commonest wrong implementation, because eight of the ten eras
 *     really do fire at three. Eras eight and ten hold nine nodes and fire at five, so
 *     the sweep over the sequence fails on two of ten — and the "more than one distinct
 *     trigger" assertion says so in one line rather than leaving it to arithmetic.
 *  2. **A hand-written table keyed by era id.** A table reproduces today's answers
 *     exactly, so no sweep over today's eras can see it. Driving
 *     `crisisTriggerForNodeCount` across the whole pacing band, and pinning that the
 *     era-level function agrees with it era by era, is what distinguishes a computation
 *     from a lookup.
 *  3. **The English form.** D-CRISIS-24: *"the median, rounded up"* reads 3.5 → **4** on
 *     an even count, which would move the four six-node eras. Asserted directly on those
 *     four rather than left implicit in the formula.
 */

/** Every era, from the registry. Nothing below writes an era id or a node id by hand. */
const ERAS = ERA_SEQUENCE;

function stateFor(nodeId: string, mastery: Mastery): StudentNodeState {
  return {
    student_id: "00000000-0000-4000-8000-000000000000",
    node_id: nodeId,
    placement_estimate: 0,
    mastery,
    mastery_updated_at: null,
    completion_status: mastery >= ISLAND_UNLOCK_MASTERY_GATE ? "complete" : "locked",
    lesson_stage: mastery >= ISLAND_UNLOCK_MASTERY_GATE ? "done" : "not_started",
    last_practiced_at: null,
  };
}

describe("the mid-era crisis trigger is derived from the era's size (D-CRISIS-9)", () => {
  it("covers every era in the shipped sequence, and there are ten of them", () => {
    // The floor. A sweep over an empty or truncated sequence would pass every assertion
    // below by having nothing to check, which is how a green guard measures nothing.
    expect(ERAS.length).toBe(10);
    expect(new Set(ERAS.map((era) => era.id)).size).toBe(ERAS.length);
  });

  it("fires at ceil(n / 2) of each era's OWN node count", () => {
    for (const era of ERAS) {
      expect(midEraCrisisTrigger(era.id), era.id).toBe(Math.ceil(era.nodes.length / 2));
    }
  });

  it("is not one number for every era, so a literal cannot satisfy it", () => {
    const triggers = ERAS.map((era) => midEraCrisisTrigger(era.id));
    // Shape, not just size: a sequence whose eras all held the same node count would make
    // every trigger equal and this suite unable to tell a computation from a constant. So
    // the era table's own variety is asserted first, and then the trigger's.
    expect(new Set(ERAS.map((era) => era.nodes.length)).size).toBeGreaterThan(1);
    expect(new Set(triggers).size).toBeGreaterThan(1);

    // Named, because these are the two the lead's own worked examples pin: nine nodes
    // fire at five, five or six fire at three. Derived from the sequence rather than
    // asserted against era ids, so a re-sized era moves this expectation with it.
    for (const era of ERAS) {
      if (era.nodes.length === 9) {
        expect(midEraCrisisTrigger(era.id), era.id).toBe(5);
      }
      if (era.nodes.length === 5 || era.nodes.length === 6) {
        expect(midEraCrisisTrigger(era.id), era.id).toBe(3);
      }
    }
  });

  it("computes the trigger at counts no era holds, so a lookup table fails", () => {
    // The distinguishing test. Every era-level answer above is reproducible by a table;
    // none of these is, because the sequence contains no era of 1, 2, 3, 4, 7, 8 or 10
    // nodes and the function still has to answer for them.
    const shipped = new Set(ERAS.map((era) => era.nodes.length));
    const unshipped = [1, 2, 3, 4, 7, 8, 10, 11, 12].filter((count) => !shipped.has(count));
    expect(unshipped.length).toBeGreaterThanOrEqual(7);
    for (const count of unshipped) {
      expect(crisisTriggerForNodeCount(count), `${count} nodes`).toBe(Math.ceil(count / 2));
    }

    // ...and the era-level function is that same arithmetic applied to the era's size,
    // rather than a second implementation that happens to agree today.
    for (const era of ERAS) {
      expect(midEraCrisisTrigger(era.id), era.id).toBe(
        crisisTriggerForNodeCount(era.nodes.length),
      );
    }
  });

  it("stays inside the pacing band's 2..5, so no era can fire at its first node", () => {
    // §5.12: `ERA_MIN_NODES` 3 and `ERA_MAX_NODES` 9 bound the trigger at 2 to 5 whatever
    // future authoring does, and 2 is the floor — there is no era size that puts the
    // crisis on the very first node.
    expect(crisisTriggerForNodeCount(ERA_MIN_NODES)).toBe(2);
    expect(crisisTriggerForNodeCount(ERA_MAX_NODES)).toBe(5);
    for (const era of ERAS) {
      const trigger = midEraCrisisTrigger(era.id);
      expect(trigger, era.id).toBeGreaterThanOrEqual(2);
      expect(trigger, era.id).toBeLessThanOrEqual(5);
      expect(trigger, era.id).toBeLessThan(era.nodes.length);
    }
  });

  it("codes the formula and not 'the median, rounded up' (D-CRISIS-24)", () => {
    // The English form reads 3.5 -> 4 on an even count. Every even-sized era is checked
    // against the reading it must NOT have, and the population is asserted non-empty so
    // this cannot pass by there being no even-sized era left.
    const evenEras = ERAS.filter((era) => era.nodes.length % 2 === 0);
    expect(evenEras.length).toBeGreaterThanOrEqual(4);
    for (const era of evenEras) {
      expect(midEraCrisisTrigger(era.id), era.id).toBe(era.nodes.length / 2);
      expect(midEraCrisisTrigger(era.id), era.id).not.toBe(era.nodes.length / 2 + 1);
    }
  });
});

describe("the nodes standing at the trigger", () => {
  it("is the era's own authored prefix, as long as the trigger says", () => {
    for (const era of ERAS) {
      const ids = midEraCrisisNodeIds(era.id);
      expect(ids.length, era.id).toBe(midEraCrisisTrigger(era.id));
      expect([...ids], era.id).toEqual(era.nodes.slice(0, ids.length));
      // Every one of them is a node of THIS era, which is what makes the seed legitimate.
      for (const nodeId of ids) {
        expect(era.nodes, `${era.id}/${nodeId}`).toContain(nodeId);
      }
    }
  });
});

describe("reading the call from a learner's node states", () => {
  it("counts only THIS era's nodes, at the trial's own mastery bar", () => {
    expect(CRISIS_MASTERY_GATE).toBe(ISLAND_UNLOCK_MASTERY_GATE);

    for (const era of ERAS) {
      const trigger = midEraCrisisTrigger(era.id);
      const owned = midEraCrisisNodeIds(era.id);
      // Every node of every OTHER era, mastered. None of it may count toward this call.
      const foreign = ERAS.filter((other) => other.id !== era.id).flatMap((other) =>
        other.nodes.map((nodeId) => stateFor(nodeId, 3)),
      );

      const beforeAny = midEraCrisisCall(era.id, foreign);
      expect(beforeAny.mastered, era.id).toBe(0);
      expect(beforeAny.standing, era.id).toBe(false);
      expect(beforeAny.trigger, era.id).toBe(trigger);
      expect(beforeAny.era_nodes, era.id).toBe(era.nodes.length);

      // One short of the trigger: the call has NOT been made.
      const short = [
        ...foreign,
        ...owned.slice(0, trigger - 1).map((nodeId) => stateFor(nodeId, 2)),
      ];
      expect(midEraCrisisCall(era.id, short).mastered, era.id).toBe(trigger - 1);
      expect(midEraCrisisCall(era.id, short).standing, era.id).toBe(false);

      // The trigger node lands: the call stands.
      const at = [...foreign, ...owned.map((nodeId) => stateFor(nodeId, 2))];
      expect(midEraCrisisCall(era.id, at).mastered, era.id).toBe(trigger);
      expect(midEraCrisisCall(era.id, at).standing, era.id).toBe(true);
    }
  });

  it("does not count a node that is complete but never practised", () => {
    // A diagnostic test-out writes `completion_status: complete` at mastery 0. The trial
    // gate is mastery, so a tested-out node is not a mastered one, and a crisis called on
    // completion would fire for a learner who has answered nothing in the era.
    const era = getEraOrThrow(ERAS[0]?.id ?? "prehistoric");
    const testedOut = era.nodes.map((nodeId) => ({
      ...stateFor(nodeId, 0),
      completion_status: "complete" as const,
      lesson_stage: "done" as const,
    }));
    expect(midEraCrisisCall(era.id, testedOut).mastered).toBe(0);
    expect(midEraCrisisCall(era.id, testedOut).standing).toBe(false);
  });

  it("is monotone: mastering the era's remaining nodes never withdraws the call", () => {
    for (const era of ERAS) {
      let standing = false;
      for (let count = 0; count <= era.nodes.length; count += 1) {
        const states = era.nodes.slice(0, count).map((nodeId) => stateFor(nodeId, 2));
        const call = midEraCrisisCall(era.id, states);
        expect(call.mastered, `${era.id} at ${count}`).toBe(count);
        if (standing) {
          expect(call.standing, `${era.id} at ${count}`).toBe(true);
        }
        standing = call.standing;
      }
      expect(standing, era.id).toBe(true);
    }
  });

  it("throws on an era that is not in the sequence, rather than defaulting to era one", () => {
    // @ts-expect-error — the point of the test is the runtime behaviour on a bad id.
    expect(() => midEraCrisisTrigger("bronze_ag")).toThrow(/Unknown era/);
  });
});
