import { describe, expect, it } from "vitest";

import { ERA_SEQUENCE, type EraId } from "./eras";
import {
  buildEraTimeline,
  ERA_SUMMARIES,
  type EraStanding,
  eraSummary,
} from "./eraTimeline";
import { getProductNodes } from "./index";

/**
 * The learner-facing era copy, and the derivation that places the marker on it.
 *
 * Two properties are worth a test rather than a read-through, and both are the kind
 * that hold trivially if the population is wrong, so both are floored:
 *
 *  1. **No bookkeeping reaches the learner.** The forbidden vocabulary is DERIVED from
 *     the registry — every product node id and every domain id in it — rather than
 *     listed here, so a node added tomorrow is swept the day it lands. Listing them
 *     would be the same mistake as labelling an era by its domain: a hand-maintained
 *     copy of something the source already knows.
 *  2. **The marker is the earliest gap, not the furthest progress.** Every plausible
 *     wrong implementation agrees with the right one when a learner's knowledge is a
 *     prefix of the sequence, which is every case that arises today. So the cases that
 *     separate them are the ones written out below: banked out-of-order mastery
 *     (D-ERA17), a node outside every era, and a finished sequence.
 */

const productNodeIds = getProductNodes().map((node) => node.id);
const domainIds = [...new Set(getProductNodes().map((node) => node.domain))];

/** Every string this module will ever put in front of a learner. */
function learnerFacingStrings(): { where: string; text: string }[] {
  return ERA_SEQUENCE.flatMap((era) => [
    { where: `${era.id}.concept`, text: ERA_SUMMARIES[era.id].concept },
    { where: `${era.id}.summary`, text: ERA_SUMMARIES[era.id].summary },
  ]);
}

describe("the era copy", () => {
  it("covers exactly the authored sequence, in both directions", () => {
    const sequenceIds = ERA_SEQUENCE.map((era) => era.id).sort();
    const copyIds = (Object.keys(ERA_SUMMARIES) as EraId[]).sort();

    expect(copyIds).toEqual(sequenceIds);
    // A floor, because two empty lists are also equal.
    expect(sequenceIds.length).toBe(10);

    for (const era of ERA_SEQUENCE) {
      expect(eraSummary(era.id).concept.length, `${era.id} has no concept`).toBeGreaterThan(
        12,
      );
      expect(eraSummary(era.id).summary.length, `${era.id} has no summary`).toBeGreaterThan(
        80,
      );
    }
  });

  /**
   * THE ONE THAT MATTERS. An era is a curated node set and three of them hold more than
   * one domain, so the domain is an internal axis with no learner-facing meaning. The
   * vocabulary is read off the registry so it cannot fall behind it, and it is floored
   * on both sides: an empty forbidden list passes over any copy, and empty copy passes
   * against any forbidden list.
   */
  it("never shows a node id or a domain id", () => {
    const strings = learnerFacingStrings();
    expect(strings.length, "no copy to sweep").toBe(20);
    expect(productNodeIds.length, "no node ids to look for").toBeGreaterThanOrEqual(62);
    expect(domainIds.length, "no domain ids to look for").toBeGreaterThanOrEqual(10);

    for (const { where, text } of strings) {
      for (const nodeId of productNodeIds) {
        expect(text, `${where} names the node ${nodeId}`).not.toContain(nodeId);
      }
      for (const domainId of domainIds) {
        expect(
          new RegExp(`\\b${domainId}\\b`).test(text),
          `${where} names the domain ${domainId}`,
        ).toBe(false);
      }
    }
  });

  /**
   * The counter-example that shows the sweep above is measuring something. `rationale`
   * is a good field written for a maintainer, and it is exactly what the copy must not
   * become: run the same rule over it and it fails on almost every era.
   */
  it("is a different thing from the maintainer-facing rationale, which is unshowable", () => {
    const unshowable = ERA_SEQUENCE.filter((era) =>
      productNodeIds.some((nodeId) => era.rationale.includes(nodeId)),
    );
    expect(
      unshowable.length,
      "no era rationale cites a node id, so the sweep above proves nothing",
    ).toBeGreaterThanOrEqual(4);
  });

  it("does not simply restate the era name", () => {
    for (const era of ERA_SEQUENCE) {
      const { concept, summary } = eraSummary(era.id);
      expect(concept.toLowerCase()).not.toContain(era.name.toLowerCase());
      expect(summary.toLowerCase()).not.toContain(era.name.toLowerCase());
    }
  });
});

/** Every node of the eras up to and including `throughNumber`. */
function nodesThrough(throughNumber: number): string[] {
  return ERA_SEQUENCE.slice(0, throughNumber).flatMap((era) => [...era.nodes]);
}

function standings(masteredNodeIds: readonly string[]): EraStanding[] {
  return buildEraTimeline(masteredNodeIds).entries.map((entry) => entry.standing);
}

describe("where the city stands", () => {
  it("puts the marker on era one when nothing is mastered, which is where it sits today", () => {
    const timeline = buildEraTimeline([]);

    expect(timeline.currentEraId).toBe("prehistoric");
    expect(timeline.currentNumber).toBe(1);
    expect(timeline.masteredTotal).toBe(0);
    expect(timeline.allComplete).toBe(false);
    expect(standings([])).toEqual([
      "current",
      "ahead",
      "ahead",
      "ahead",
      "ahead",
      "ahead",
      "ahead",
      "ahead",
      "ahead",
      "ahead",
    ]);
    // Every era still reports its size, so the empty state can say "0 of 6" rather
    // than nothing at all.
    for (const entry of timeline.entries) {
      expect(entry.masteredCount).toBe(0);
      expect(entry.nodeCount).toBeGreaterThanOrEqual(3);
    }
  });

  it("stays on an era until its LAST skill is mastered", () => {
    const eraOne = ERA_SEQUENCE[0];
    if (!eraOne) {
      throw new Error("ERA_SEQUENCE is empty");
    }
    const allButOne = eraOne.nodes.slice(0, -1);
    expect(allButOne.length).toBe(eraOne.nodes.length - 1);

    const partway = buildEraTimeline(allButOne);
    expect(partway.currentEraId).toBe("prehistoric");
    expect(partway.entries[0]?.masteredCount).toBe(eraOne.nodes.length - 1);
    expect(partway.entries[0]?.standing).toBe("current");

    const finished = buildEraTimeline(eraOne.nodes);
    expect(finished.currentEraId).toBe("neolithic");
    expect(finished.currentNumber).toBe(2);
    expect(finished.entries[0]?.standing).toBe("complete");
    expect(finished.entries[1]?.standing).toBe("current");
  });

  it("advances one chapter at a time as each era is finished", () => {
    for (let through = 0; through < ERA_SEQUENCE.length; through += 1) {
      const timeline = buildEraTimeline(nodesThrough(through));
      expect(timeline.currentNumber, `after finishing ${through} eras`).toBe(through + 1);
      expect(timeline.entries.filter((e) => e.standing === "complete").length).toBe(
        through,
      );
      expect(timeline.entries.filter((e) => e.standing === "current").length).toBe(1);
    }
  });

  /**
   * D-ERA17: knowledge banked in a later era does NOT move the marker. This is the case
   * that separates "the earliest era with a gap" from "the furthest era with progress",
   * and the two agree everywhere else — so without it, a derivation that read the
   * furthest mastered era would pass every other test in this file.
   */
  it("does not move the marker for a later era mastered out of order", () => {
    const bankedEra = ERA_SEQUENCE[4];
    if (!bankedEra) {
      throw new Error("ERA_SEQUENCE is shorter than five eras");
    }

    const timeline = buildEraTimeline(bankedEra.nodes);

    expect(timeline.currentEraId).toBe("prehistoric");
    expect(timeline.currentNumber).toBe(1);
    // The banked era is fully mastered and still ahead of the learner: its lessons are
    // discharged, its trial is not.
    const banked = timeline.entries[4];
    expect(banked?.era.id).toBe(bankedEra.id);
    expect(banked?.masteredCount).toBe(bankedEra.nodes.length);
    expect(banked?.standing).toBe("ahead");
    expect(timeline.masteredTotal).toBe(bankedEra.nodes.length);
  });

  it("ignores a mastered node that belongs to no era", () => {
    const timeline = buildEraTimeline(["NOT.A.NODE", "D4", "prehistoric"]);

    expect(timeline.masteredTotal).toBe(0);
    expect(timeline.currentEraId).toBe("prehistoric");
    expect(timeline.entries.every((entry) => entry.masteredCount === 0)).toBe(true);
  });

  it("has no current era once the whole sequence is complete", () => {
    const timeline = buildEraTimeline(nodesThrough(ERA_SEQUENCE.length));

    expect(timeline.allComplete).toBe(true);
    expect(timeline.currentEraId).toBeNull();
    expect(timeline.currentNumber).toBeNull();
    expect(timeline.entries.every((entry) => entry.standing === "complete")).toBe(true);
    expect(timeline.masteredTotal).toBe(
      ERA_SEQUENCE.reduce((total, era) => total + era.nodes.length, 0),
    );
  });

  it("walks the authored sequence rather than holding its own order", () => {
    expect(buildEraTimeline([]).entries.map((entry) => entry.era.id)).toEqual(
      ERA_SEQUENCE.map((era) => era.id),
    );
    expect(buildEraTimeline([]).entries.map((entry) => entry.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });
});
