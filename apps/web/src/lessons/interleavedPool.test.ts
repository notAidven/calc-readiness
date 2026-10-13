import { ERA_SEQUENCE, type EraId, getEraNodes, getEraOfNode } from "@cr/skill-graph";
import type { Mastery } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { INTERLEAVED_PRACTICE_MIN_COMPLETED } from "../city/townHall";
import { domainForNode } from "./domains";
import {
  interleavedPool,
  interleavedPoolItems,
  interleavedSkillIds,
} from "./interleavedPool";
import { completedNodeIdsFrom } from "./lessonProgress";
import { practiceItemsById } from "./practiceChecker";

/** A node state carrying only the two fields the completion rule reads. */
function state(node_id: string, mastery: Mastery): { node_id: string; mastery: Mastery } {
  return { node_id, mastery };
}

/** Every node the item bank can serve an interleaved problem for, era membership aside. */
function servableNodeIds(): ReadonlySet<string> {
  const nodes = new Set<string>();
  for (const item of practiceItemsById.values()) {
    nodes.add(item.node_id);
  }
  return nodes;
}

/**
 * THE WRONG DERIVATION, WRITTEN OUT SO THE GUARD CAN BE SHOWN TO REJECT IT.
 *
 * This is what `interleavedPoolItems` computed before the era model: the pool keyed on
 * the lesson DOMAIN that owns each node. It is the shape a future refactor is most likely
 * to reach for, since the domain registry is the thing every other lesson surface reads.
 * Asserting only that the correct derivation holds would pass over both, so the census
 * below asserts the two are measurably DIFFERENT and names where.
 */
function domainKeyedSkillIds(eraId: EraId): readonly string[] {
  const servable = servableNodeIds();
  const skills = new Set<string>();
  for (const nodeId of getEraNodes(eraId)) {
    const domain = domainForNode(nodeId);
    if (!domain) {
      continue;
    }
    for (const candidate of servable) {
      if (domain.ownsNode(candidate)) {
        skills.add(candidate);
      }
    }
  }
  return [...skills];
}

describe("the interleaved drill's pool — one rule for the drill and the surface offering it", () => {
  it("draws only from the era's own practiced skills", () => {
    const skills = interleavedSkillIds("prehistoric", ["NUM.S", "NUM.F"]);
    expect(new Set(skills)).toEqual(new Set(["NUM.S", "NUM.F"]));
    // The gate is only meaningful if the era held other skills back.
    expect(interleavedSkillIds("prehistoric", "all").length).toBeGreaterThan(skills.length);
  });

  it("ignores skills belonging to another era", () => {
    // `EXP.1` is authored and drillable, just not in era one — it is Neolithic.
    expect(getEraOfNode("EXP.1")?.id).toBe("neolithic");
    expect(interleavedSkillIds("neolithic", ["EXP.1"])).toEqual(["EXP.1"]);
    expect(interleavedSkillIds("prehistoric", ["EXP.1"])).toEqual([]);
    expect(interleavedPoolItems("prehistoric", ["EXP.1"])).toEqual([]);
  });

  it("is empty for an unknown era rather than throwing", () => {
    // The Town Hall asks about its own era before any drill mounts; an era with no
    // authored lessons must read as "nothing to mix", not crash the city.
    expect(interleavedSkillIds("not-an-era" as EraId, "all")).toEqual([]);
  });

  it("counts only skills the item bank can actually serve problems for", () => {
    // A completed skill with no items contributes nothing to interleave, so it must
    // not count toward the entry point's floor.
    const skills = interleavedSkillIds("prehistoric", ["NUM.S", "not-a-node"]);
    expect(skills).toEqual(["NUM.S"]);
  });

  it("matches the drill's completion rule: a tested-out node is not practiced", () => {
    // The seam the Town Hall gate turns on — a diagnostic test-out marks a node
    // complete/done at mastery 0, and it must not unlock a mix.
    const testedOut = [state("NUM.S", 0), state("NUM.F", 0)];
    expect(completedNodeIdsFrom(testedOut)).toEqual([]);
    expect(interleavedSkillIds("prehistoric", completedNodeIdsFrom(testedOut))).toEqual([]);

    const practiced = [state("NUM.S", 1), state("NUM.F", 2), state("NUM.2", 0)];
    expect(
      new Set(interleavedSkillIds("prehistoric", completedNodeIdsFrom(practiced))),
    ).toEqual(new Set(["NUM.S", "NUM.F"]));
  });

  it("hands the drill whole items, all belonging to the era", () => {
    const items = interleavedPoolItems("prehistoric", ["NUM.S"]);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.node_id === "NUM.S")).toBe(true);
  });
});

/**
 * The population guard. Its job is not to restate that the filter filters: it is to pin
 * that the set being filtered is **the era's**, derived from `ERA_SEQUENCE`, and that this
 * is a different set from the domain's — because the whole re-scope is worthless if the
 * two happen to agree, and a reader has no way to tell from the code which one shipped.
 */
describe("the drill population is derived from the era, and is not the domain's", () => {
  it("is a census of ERA_SEQUENCE with a floor, so it cannot pass over an empty bank", () => {
    const perEra = ERA_SEQUENCE.map((era) => interleavedSkillIds(era.id, "all"));

    // Containment: nothing is drawn from outside the era it was drawn for.
    for (const [index, skills] of perEra.entries()) {
      const era = ERA_SEQUENCE[index];
      if (!era) {
        throw new Error(`ERA_SEQUENCE has no entry at ${index}`);
      }
      const eraNodes = new Set<string>(getEraNodes(era.id));
      for (const nodeId of skills) {
        expect(eraNodes.has(nodeId), `${nodeId} is drilled in "${era.id}"`).toBe(true);
      }
    }

    // ...and a floor under it, because containment holds trivially over an empty bank.
    // Set-equal against the servable nodes so the census fails whichever way the two
    // come apart: a servable node in no era, or an era drilling something unservable.
    const drilled = new Set<string>(perEra.flat());
    const servableInSomeEra = new Set(
      [...servableNodeIds()].filter((nodeId) => getEraOfNode(nodeId) !== undefined),
    );
    expect(drilled).toEqual(servableInSomeEra);
    expect(drilled.size).toBeGreaterThanOrEqual(26);
  });

  it("splits an authored domain across two eras, which the domain derivation cannot", () => {
    // D5 is the live case: `RAT.1`-`RAT.4` and `RAT.6` are Medieval, `RAT.5` is
    // Early Modern (#210 moved it, so a graph-reading lesson never precedes the plane).
    // This is the assertion that fails if the population is ever re-derived per domain.
    const medieval = new Set(interleavedSkillIds("medieval", "all"));
    const renaissance = new Set(interleavedSkillIds("renaissance", "all"));

    expect(renaissance.has("RAT.5")).toBe(true);
    expect(medieval.has("RAT.5")).toBe(false);
    expect(medieval.size).toBeGreaterThanOrEqual(5);

    // Both eras' nodes are owned by the same lesson domain, so the split is a fact about
    // the ERA and is invisible to `domainForNode`.
    expect(domainForNode("RAT.5")?.id).toBe(domainForNode("RAT.1")?.id);
  });

  it("differs from the domain-keyed derivation, measurably, at RAT.5", () => {
    // The injection: run the pre-era derivation over the same tree and watch it come
    // out wrong. Without this, every assertion above would also pass on a pool that had
    // silently reverted to `domain.ownsNode`.
    const eraKeyed = new Set(interleavedSkillIds("medieval", "all"));
    const domainKeyed = new Set(domainKeyedSkillIds("medieval"));

    expect(domainKeyed.has("RAT.5")).toBe(true);
    expect(eraKeyed.has("RAT.5")).toBe(false);
    expect(domainKeyed.size).toBe(eraKeyed.size + 1);
  });
});

/**
 * THE FALLBACK, and what it must NOT do.
 *
 * The defect it closes, measured at `03d5a2b9`: a learner who has finished all six era-one
 * skills advances and the hub's only repeatable activity goes inert in all nine later eras,
 * because the pool intersects the era's nodes with the learner's completed nodes and only
 * era one's nodes can be completed today. So a caller may ask for the learner's whole
 * practised set — and every assertion here is about the fallback staying a fallback: it is
 * OPT-IN, it never fires for the dev bypass, it never lowers the floor, and it never fires
 * while the era can mix its own.
 *
 * `ERA_ONE_PRACTICED` is derived from the era rather than written out, so a node moving
 * between eras cannot leave this measuring a list transcribed here.
 */
const ERA_ONE_PRACTICED = interleavedSkillIds("prehistoric", "all");

describe("the pool widens past the era only when asked, and never below the floor", () => {
  it("is era-scoped by default, so an era with none of its own practiced mixes nothing", () => {
    // The behaviour every other caller still gets, stated first so the widening below
    // reads as the difference between two calls and not as the module's new normal.
    const locked = interleavedPool("neolithic", ERA_ONE_PRACTICED);
    expect(locked.source).toBe("era");
    expect(locked.skillIds).toEqual([]);
    expect(locked.items).toEqual([]);
    // ...and the two thin reads are that same default, so `?dev` and the ceremony are
    // untouched by anything below.
    expect(interleavedSkillIds("neolithic", ERA_ONE_PRACTICED)).toEqual([]);
    expect(interleavedPoolItems("neolithic", ERA_ONE_PRACTICED)).toEqual([]);
  });

  it("revisits every practiced skill when the era has none of its own, and SAYS SO", () => {
    // THE DEFECT, INVERTED: era two, six era-one skills finished. The learner gets a mix
    // rather than a dead button, and `source` is what lets the offer name it as a revisit
    // instead of passing era one's skills off as the Neolithic's own.
    const widened = interleavedPool("neolithic", ERA_ONE_PRACTICED, "revisit-practiced");

    expect(widened.source).toBe("practiced");
    expect(new Set(widened.skillIds)).toEqual(new Set(ERA_ONE_PRACTICED));
    expect(widened.skillIds.length).toBeGreaterThanOrEqual(
      INTERLEAVED_PRACTICE_MIN_COMPLETED,
    );
    expect(widened.items.length).toBeGreaterThan(0);
    // Every item really is drillable content, and none of it is the Neolithic's — which
    // is the fact the copy has to be able to state.
    const neolithicNodes = new Set<string>(getEraNodes("neolithic"));
    for (const item of widened.items) {
      expect(neolithicNodes.has(item.node_id)).toBe(false);
    }
  });

  it("does it in EVERY era after the first, which is the whole population", () => {
    // A floor under the claim rather than one worked example: the defect was reproduced in
    // nine eras, so the fix is asserted in nine. Era one is excluded because its own pool
    // can be mixed, which the case below is about.
    const later = ERA_SEQUENCE.slice(1);
    expect(later.length).toBe(ERA_SEQUENCE.length - 1);
    expect(later.length).toBeGreaterThanOrEqual(9);
    for (const era of later) {
      const widened = interleavedPool(era.id, ERA_ONE_PRACTICED, "revisit-practiced");
      expect(
        widened.skillIds.length,
        `${era.id} still cannot offer a mix`,
      ).toBeGreaterThanOrEqual(INTERLEAVED_PRACTICE_MIN_COMPLETED);
    }
  });

  it("keeps the era's OWN mix when the era can be mixed, so nothing widens silently", () => {
    // The injection that stops the fallback becoming the derivation: era one can mix its
    // own, so asking for the fallback must change nothing at all there. Without this, a
    // pool that had quietly stopped consulting the era would pass every case above.
    const strict = interleavedPool("prehistoric", ERA_ONE_PRACTICED);
    const asked = interleavedPool("prehistoric", ERA_ONE_PRACTICED, "revisit-practiced");

    expect(asked.source).toBe("era");
    expect(asked.skillIds).toEqual(strict.skillIds);
    expect(asked.items).toEqual(strict.items);
  });

  it("includes the era's own node when it widens, rather than replacing it", () => {
    // BELOW THE FLOOR BUT NOT EMPTY, built from the LEARNER'S set rather than from how much
    // content happens to be authored. The widening triggers on how many of the era's own
    // nodes THIS learner has practised, so one practised node in a later era is the case
    // whatever that era's total is — which is the point, because the previous version of this
    // test hardcoded Early Modern as "one authored node" and D10's authoring took it to
    // three, making the witness stop witnessing without making the claim false.
    const laterEra = ERA_SEQUENCE.find(
      (era) => era.id !== "prehistoric" && interleavedSkillIds(era.id, "all").length > 0,
    );
    expect(laterEra, "no era outside era one can serve an item").toBeDefined();
    const eraId = laterEra?.id ?? "neolithic";

    // Exactly one of that era's own, so the era's mixable set is non-empty and under the bar.
    const ownNode = interleavedSkillIds(eraId, "all")[0];
    expect(ownNode).toBeDefined();
    const practiced = [...ERA_ONE_PRACTICED, ...(ownNode === undefined ? [] : [ownNode])];
    expect(interleavedSkillIds(eraId, practiced).length).toBe(1);
    expect(1).toBeLessThan(INTERLEAVED_PRACTICE_MIN_COMPLETED);

    const widened = interleavedPool(eraId, practiced, "revisit-practiced");
    expect(widened.source).toBe("practiced");
    expect(new Set(widened.skillIds)).toEqual(new Set(practiced));
    // The era's own node is INCLUDED and not replaced, which is the whole claim: a revisit
    // adds the other eras' skills to this one's rather than substituting them for it.
    expect(widened.skillIds).toContain(ownNode);
    expect(widened.skillIds.length).toBe(ERA_ONE_PRACTICED.length + 1);
  });

  it("does NOT lower the floor: one practiced skill is still one, in every era", () => {
    // The bar is unchanged and the fallback cannot conjure a second skill. Asserted over
    // all ten eras, because "the gate was not loosened" is a claim about the whole
    // sequence and a single era would leave the other nine untested.
    const one = ERA_ONE_PRACTICED.slice(0, 1);
    expect(one).toHaveLength(1);
    for (const era of ERA_SEQUENCE) {
      const widened = interleavedPool(era.id, one, "revisit-practiced");
      expect(
        widened.skillIds.length,
        `${era.id} offered a mix from one practiced skill`,
      ).toBeLessThan(INTERLEAVED_PRACTICE_MIN_COMPLETED);
    }
    // And nothing practised anywhere stays nothing, rather than reading as a revisit of
    // an empty set.
    const none = interleavedPool("neolithic", [], "revisit-practiced");
    expect(none.skillIds).toEqual([]);
    expect(none.source).toBe("era");
  });

  /**
   * NEVER WIDENS THE DEV BYPASS, RE-AIMED FROM ONE UNAUTHORED ERA ONTO ALL TEN.
   *
   * The claim is unchanged and is still live: `"all"` has no learner set to widen TO, so
   * `whenEraCannotMix` must be inert under it, and the `?dev` era list's whole job is to
   * report per-era what the bank holds. Widen `"all"` and every era prints the same
   * number and opens the same drill under ten different names.
   *
   * What changed is the FIXTURE. This asked the pool for an era it could serve nothing
   * for and asserted that one era reported zero, with an instruction to delete rather
   * than re-aim if the search ever came up empty. D6 (Functions, #422) empties it: on the
   * tree that PR and `integration` make together the least-served era offers four skills.
   * But the fixture was never the claim — an unauthored era was simply where the
   * difference between widening and not was starkest, and the property holds of every
   * era, authored or not.
   *
   * So it is asserted as a census: for all ten, asking for the fallback under the bypass
   * returns EXACTLY what not asking returns. Read what that does and does not buy:
   *
   *  - It catches the refactor the module's docblock names, `"all"` widening to "every
   *    item in the bank". Forced red rather than argued: return the whole bank when
   *    `unlocked === null && whenEraCannotMix === "revisit-practiced"` and this fails at
   *    *"prehistoric widened under the dev bypass: expected 'practiced' to be 'era'"*,
   *    with the other sixteen cases in this file still green.
   *  - It does NOT catch the `unlocked === null ||` clause simply being dropped from
   *    `interleavedPool`, and nothing here can any more: the rest of that condition only
   *    lets a call through when the era is under the interleaving floor, and no era is.
   *    `tsc --build` is what stops that edit now, since the early return is also what
   *    narrows `unlocked` away from `null` before it is read.
   *
   * The floor is set equality against the bank rather than a count of eras, for the same
   * reason the census at the top of this file uses one: ten empty pools satisfy every
   * per-era line here, and a total would be satisfied by one well-stocked era. It is
   * also the floor that does not need revising as content lands, which is what the
   * assertion this replaces could not say for itself.
   */
  it("never widens the DEV BYPASS, in any era, however much content it has", () => {
    const perEra: string[][] = [];

    for (const era of ERA_SEQUENCE) {
      const strict = interleavedPool(era.id, "all");
      const asked = interleavedPool(era.id, "all", "revisit-practiced");

      expect(asked.source, `${era.id} widened under the dev bypass`).toBe("era");
      expect(asked.skillIds, `${era.id} drew different skills for the bypass`).toEqual(
        strict.skillIds,
      );
      expect(asked.items).toEqual(strict.items);
      // ...and what it drew is the ERA's, which is the fact the `?dev` count reports.
      const eraNodes = new Set<string>(getEraNodes(era.id));
      for (const nodeId of asked.skillIds) {
        expect(eraNodes.has(nodeId), `${nodeId} is offered under "${era.id}"`).toBe(true);
      }
      perEra.push([...asked.skillIds]);
    }

    // THE FLOOR, set-equal so it fails whichever way the two come apart, and floored on
    // size so it cannot hold over an empty bank.
    const drilled = new Set<string>(perEra.flat());
    const servableInSomeEra = new Set(
      [...servableNodeIds()].filter((nodeId) => getEraOfNode(nodeId) !== undefined),
    );
    expect(drilled).toEqual(servableInSomeEra);
    expect(drilled.size).toBeGreaterThanOrEqual(26);
    // ...and the bank really does hold enough for a widening to have had somewhere to
    // go, which is what makes "it did not widen" a statement about the pool rather than
    // about an empty bank.
    expect(ERA_ONE_PRACTICED.length).toBeGreaterThanOrEqual(
      INTERLEAVED_PRACTICE_MIN_COMPLETED,
    );
  });

  it("is empty for an unknown era whether or not the fallback is asked for", () => {
    expect(
      interleavedPool("not-an-era" as EraId, ERA_ONE_PRACTICED, "revisit-practiced")
        .skillIds,
    ).toEqual([]);
  });
});
