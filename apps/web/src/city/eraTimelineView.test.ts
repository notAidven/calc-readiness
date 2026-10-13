import { ISLAND_UNLOCK_MASTERY_GATE, islandUnlockEligibility } from "@cr/game";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import type { Mastery, StudentNodeState } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { lessonByNode } from "../lessons/domains";
import {
  cityEraTimeline,
  ERA_MASTERED_MASTERY,
  eraBuildStateFor,
  masteredNodeIdsFrom,
} from "./eraTimelineView";

/**
 * The app's half of the timeline: which bar counts as mastered, and how much of each
 * era exists.
 *
 * Both are places where a plausible wrong answer is also a flattering one — a lower bar
 * makes the marker move sooner, and a hand-kept authored list makes more eras look
 * finished than are — so both are held against the thing they mirror rather than
 * against a number written here.
 */

function state(node_id: string, mastery: Mastery): StudentNodeState {
  return {
    student_id: "demo-student",
    node_id,
    placement_estimate: 0,
    mastery,
    mastery_updated_at: null,
    completion_status: mastery >= 2 ? "complete" : "in_progress",
    lesson_stage: mastery >= 2 ? "done" : "practice",
    last_practiced_at: null,
  };
}

const eraOne = ERA_SEQUENCE[0];
if (!eraOne) {
  throw new Error("ERA_SEQUENCE is empty");
}

describe("the mastery bar the timeline reads", () => {
  /**
   * THE ANTI-DRIFT GUARD, as an equivalence rather than a comparison of two numbers:
   * for EVERY era, the timeline counts that era's fully mastered skills exactly as
   * island unlock eligibility does. Same bar and same population, driven one
   * step either side of the bar so neither direction can pass by accident, and over the
   * whole sequence because the two derivations read different sources —
   * `islandUnlockEligibility` walks `getEraNodes`, this module walks `buildEraTimeline` —
   * so an era that fell out of one of them would still agree everywhere else.
   *
   * It is compared against `masteredCount === nodeCount` and NOT against
   * `standing === "complete"`, and the difference is real rather than pedantic: the
   * standing also carries D-ERA17's banking rule, so an era mastered out of order is
   * fully mastered while still sitting AHEAD of the learner.
   * The first version of this test compared the standings and failed on exactly that
   * case, which is the case the banking rule exists for.
   */
  it("counts fully mastered skills exactly as island unlock eligibility does", () => {
    const belowBar = (ISLAND_UNLOCK_MASTERY_GATE - 1) as Mastery;
    expect(ERA_MASTERED_MASTERY).toBe(ISLAND_UNLOCK_MASTERY_GATE);

    let checked = 0;
    for (const era of ERA_SEQUENCE) {
      for (const mastery of [belowBar, ISLAND_UNLOCK_MASTERY_GATE] as const) {
        const states = era.nodes.map((nodeId) => state(nodeId, mastery));
        const row = cityEraTimeline(states).rows.find((r) => r.era.id === era.id);
        checked += 1;
        expect(
          row?.masteredCount,
          `${era.id} at mastery ${mastery}: timeline and eligibility counts disagree`,
        ).toBe(islandUnlockEligibility(era.id, states).mastered);
      }
    }
    expect(checked, "no era was driven across the bar").toBe(ERA_SEQUENCE.length * 2);
    // A floor on the equivalence being non-trivial: it has to have been true in both
    // directions, not just false everywhere.
    expect(
      ERA_SEQUENCE.filter(
        (era) =>
          islandUnlockEligibility(
            era.id,
            era.nodes.map((nodeId) => state(nodeId, ISLAND_UNLOCK_MASTERY_GATE)),
          ).mastered === era.nodes.length,
      ).length,
    ).toBe(ERA_SEQUENCE.length);
  });

  it("is not the practiced bar, which is one lower and answers a different question", () => {
    const practiced = [state("NUM.S", 1)];
    expect(masteredNodeIdsFrom(practiced)).toEqual([]);
    expect(masteredNodeIdsFrom([state("NUM.S", 2)])).toEqual(["NUM.S"]);
    expect(masteredNodeIdsFrom([state("NUM.S", 3)])).toEqual(["NUM.S"]);
  });
});

describe("the timeline the city shows", () => {
  it("puts every learner at the start of era one today", () => {
    const timeline = cityEraTimeline([]);

    expect(timeline.rows).toHaveLength(ERA_SEQUENCE.length);
    expect(timeline.currentNumber).toBe(1);
    expect(timeline.masteredTotal).toBe(0);
    expect(timeline.rows[0]?.standing).toBe("current");
    expect(timeline.rows.filter((row) => row.standing === "ahead")).toHaveLength(9);
  });

  it("moves the marker once every skill of era one is mastered", () => {
    const timeline = cityEraTimeline(eraOne.nodes.map((nodeId) => state(nodeId, 2)));

    expect(timeline.currentNumber).toBe(2);
    expect(timeline.rows[0]?.standing).toBe("complete");
    expect(timeline.rows[0]?.masteredCount).toBe(eraOne.nodes.length);
  });

  it("does not move the marker for skills that were only practiced", () => {
    const timeline = cityEraTimeline(eraOne.nodes.map((nodeId) => state(nodeId, 1)));

    expect(timeline.currentNumber).toBe(1);
    expect(timeline.rows[0]?.masteredCount).toBe(0);
  });

  /**
   * The authored count is read from the lesson registry, and this is what stops that
   * being a claim. The population is every era's nodes; the property is that the count
   * matches what `lessonByNode` actually holds, era by era. Delete a lesson pack and
   * this moves on its own, which is the whole reason it is not a table.
   */
  it("counts authored lessons from the registry, era by era", () => {
    const timeline = cityEraTimeline([]);
    let checked = 0;

    for (const row of timeline.rows) {
      const authored = row.era.nodes.filter((nodeId) => lessonByNode[nodeId] !== undefined);
      checked += row.era.nodes.length;
      expect(row.authoredCount, `${row.era.id}`).toBe(authored.length);
      expect(row.authoredCount).toBeLessThanOrEqual(row.nodeCount);
    }

    expect(checked, "no era nodes were checked").toBe(62);
  });

  /**
   * The build states have to be genuinely distinguishable, or the surface's honest
   * labelling degenerates into one label. Asserted as a census over the tree rather than
   * as fixed numbers, so a lesson landing tomorrow moves a row between buckets without
   * reddening anything — but a change that collapsed the distinction, or that quietly
   * marked an unfinished era ready, still fails.
   *
   * **`unauthored` LEFT THIS CENSUS WITH D6, AND WAS DELETED RATHER THAN FLOORED AT
   * ZERO.** The occupancy floor here read `unauthored.length >= 1`, and its last subject
   * is the Industrial era, which holds none of its six packs. D6 (Functions, #422)
   * writes five of them, so on the tree that PR and `integration` make together no era
   * has zero and the bucket is empty. The floor fails on that tree and on neither parent
   * alone, which is why it is retired here rather than found at the merge.
   *
   * It is deleted rather than lowered because a floor of zero asserts nothing at all,
   * and the per-row loop that went with it asserts no more, since a claim about every
   * member of an empty set is free. What the variant still owes is checked one test down
   * against `eraBuildStateFor`, where the answer does not depend on how much content
   * happens to exist.
   *
   * The two floors that remain are content claims, and they are still true rather than
   * relaxed: `POL.5`, `POL.6` and `POL.7` are unwritten either way, so eras stay
   * part-written and `ready` is a distinction rather than the only bucket. When those
   * three land, the honest edit is the one made here — delete the claim, do not lower
   * the bound.
   */
  it("tells apart an era you can finish from one that is only part-written", () => {
    const timeline = cityEraTimeline([]);
    const byState = {
      ready: timeline.rows.filter((r) => r.buildState === "ready"),
      partly_authored: timeline.rows.filter((r) => r.buildState === "partly_authored"),
      unauthored: timeline.rows.filter((r) => r.buildState === "unauthored"),
    };

    // The partition, which still counts all three so a row landing in a fourth state
    // (or in none) fails here rather than going unnoticed.
    expect(
      byState.ready.length + byState.partly_authored.length + byState.unauthored.length,
    ).toBe(ERA_SEQUENCE.length);
    expect(timeline.readyCount).toBe(byState.ready.length);

    // Each bucket means exactly what it says, checked against the counts rather than
    // trusting the classifier that produced them.
    for (const row of byState.ready) {
      expect(row.authoredCount, `${row.era.id} is ready`).toBe(row.nodeCount);
    }
    for (const row of byState.partly_authored) {
      expect(row.authoredCount, `${row.era.id} is part-written`).toBeGreaterThan(0);
      expect(row.authoredCount).toBeLessThan(row.nodeCount);
    }

    // The honest state of the product, as a shape rather than as fixed figures.
    //
    // The ceiling used to be HALF the sequence, on the reading that most of the run is
    // unfinishable. Authoring falsified that in the good direction rather than in a way worth
    // failing over: the Classical era took the ready count to 5 of 10, which is not fewer than
    // half, so the ceiling became the sequence length and the occupancy floor below carried the
    // real claim.
    //
    // **Both of those have now gone the same way**, and the honest state of the product is that
    // EVERY era is finishable: `POL.5` was the last node in the product with no lesson pack, so
    // `partly_authored` is empty and `ready` is all ten. A ceiling of "fewer than ten" and a
    // floor of "at least one part-written" are both assertions about a shortfall that no longer
    // exists, and lowering them to nothing would leave this sweep saying only that the three
    // buckets partition. So the census asserts what is true — every era ready, by name — and the
    // two states nothing occupies are DRIVEN in the test below, which is the treatment
    // `unauthored` already had for exactly this reason.
    expect(byState.ready.map((r) => r.era.id)).toEqual(ERA_SEQUENCE.map((e) => e.id));
    expect(byState.partly_authored).toEqual([]);
    expect(byState.unauthored).toEqual([]);
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
  });

  /**
   * THE TWO UNOCCUPIED STATES, DRIVEN RATHER THAN SEARCHED FOR.
   *
   * The census above can no longer say anything about `unauthored` OR about
   * `partly_authored`, because no era is in either. That is a fact about the content and
   * not about the classifier: an era with no lessons at all, and an era half written, are
   * both states the product has to name, they are the states every era in the sequence
   * passed through, they are where the next era anybody adds will start and pass through,
   * and the cut Timeline panel gave them different notes ("Being written" and
   * "Part-written") — which is a distinction the archipelago's overview will want back,
   * since a locked island in an unwritten era is a different thing to say to a learner
   * from a locked island in a half-written one. Delete either branch and nothing else in
   * the suite notices.
   *
   * `partly_authored` emptied last, when `POL.5` was authored, and it emptied into the
   * assertion below rather than out of the file. That is the same move `unauthored` took
   * when D9 landed, and the reason is the same both times: a state's guard should not be
   * retired by the content happening to leave it.
   *
   * So this is aimed at `eraBuildStateFor`, which takes two counts instead of reading
   * the sequence, and it is driven either side of both boundaries so no case passes by
   * accident. It cannot go stale with content, which is exactly what the assertions it
   * replaces could not manage.
   */
  it("names an era with no lessons and one half written, states no era is in today", () => {
    expect(eraBuildStateFor(0, 6)).toBe("unauthored");
    expect(eraBuildStateFor(1, 6)).toBe("partly_authored");
    expect(eraBuildStateFor(5, 6)).toBe("partly_authored");
    expect(eraBuildStateFor(6, 6)).toBe("ready");
    // An era with no nodes at all is finishable rather than unstarted: there is nothing
    // left to write. This is the boundary the `authored >= total` test is checked first
    // for, and reversing the two branches would make an empty era report as unbuilt.
    expect(eraBuildStateFor(0, 0)).toBe("ready");
  });

  it("keeps the sequence's own order and copy", () => {
    const timeline = cityEraTimeline([]);

    expect(timeline.rows.map((row) => row.era.id)).toEqual(ERA_SEQUENCE.map((e) => e.id));
    for (const row of timeline.rows) {
      expect(row.concept.length).toBeGreaterThan(12);
      expect(row.summary.length).toBeGreaterThan(80);
    }
  });
});
