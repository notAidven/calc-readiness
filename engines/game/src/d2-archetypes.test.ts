import type { AnswerType } from "@cr/components";
import { PRODUCT_ITEM_PACK } from "@cr/item-bank/src/product";
import { getNodesByDomain } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  archetypeForAnswerType,
  type BuildingArchetypeId,
  getNeighborhoodDescriptor,
  resolveNeighborhood,
} from "./descriptors";

/**
 * D2's node→archetype hook, and the two things it is NOT.
 *
 * This mirrors `answer-type-archetype.test.ts` (D1's guard) deliberately, because D2
 * must follow D1's precedent rather than grow a second pattern: the archetype is
 * DERIVED from the frozen assessment bank's authored `answer_type`, never hand-picked,
 * so the buildings cannot drift from the items students answer.
 *
 * ## What this guard is scoped to, and why that is the population
 *
 * The behaviour at issue is "a D2 node renders as a building whose answer-type family
 * is a guess". Any node the registry puts in domain D2 and in product can exhibit it,
 * whether or not it happens to be one of the five named in the island brief — so the
 * population is DERIVED from the registry rather than transcribed, and floored so it
 * cannot pass over an empty set.
 *
 * A derived population can still be the wrong set, and a floor constrains size but not
 * shape, so {@link EXPECTED_D2} additionally asserts the COMPOSITION both ways: a node
 * the registry adds to D2 fails (the census gains a member the table lacks) and a node
 * removed from D2 fails (the table names a member the registry no longer has). Neither
 * a silently-shrunk population nor a silently-swapped one survives.
 *
 * ## This guard must not be read as "D2 renders"
 *
 * It emphatically does not, and the last `describe` block below asserts that rather
 * than leaving it to prose. `resolveNeighborhood` draws plots only from nodes with
 * `product_scope: "mvp"`, and all five D2 nodes are `target`, so D2 resolves to ZERO
 * plots and its `building_archetypes` map is inert data waiting on a registry change
 * that is not the game lane's to make. Authoring the hook is readiness, not rendering.
 */

/**
 * The MEASURED answer-type family of each D2 node, read off the frozen product
 * assessment pack, and the archetype that follows from it.
 *
 * These are measurements, not preferences, and three of them CORRECT the island brief:
 * `2026-07-26-d2-boomtown-square-island-design.md` §4 inferred the accent trim per node
 * from each skill and flagged it (§14 Q3) as "to be confirmed against the bank". Its
 * inference was constructed-response amber for EXP.1, RAD.2, RAD.3 and RAD.4 and
 * numeric teal for RAD.1. The bank says RAD.2, RAD.3 and RAD.4 are all `numeric`, so
 * they take the numeric hall and its teal, not the workshop and amber. EXP.1 and RAD.1
 * were guessed right. That is exactly why the descriptor derives instead of copying a
 * table out of a design doc.
 */
const EXPECTED_D2: Readonly<
  Record<string, { answer_type: AnswerType; archetype: BuildingArchetypeId }>
> = {
  "EXP.1": { answer_type: "expression", archetype: "constructed_response" },
  "RAD.1": { answer_type: "numeric", archetype: "numeric" },
  "RAD.2": { answer_type: "numeric", archetype: "numeric" },
  "RAD.3": { answer_type: "numeric", archetype: "numeric" },
  "RAD.4": { answer_type: "numeric", archetype: "numeric" },
};

/** Every node the REGISTRY puts in domain D2 and in product (mvp or target). */
const d2InProductNodeIds: readonly string[] = getNodesByDomain("D2")
  .filter((node) => node.product_scope === "mvp" || node.product_scope === "target")
  .map((node) => node.id);

/**
 * The authored answer types per D2 node, read straight from the frozen assessment
 * pack, with the item count kept so the caller can floor it. A set rather than a single
 * value so heterogeneity is visible instead of being overwritten by the last item.
 */
function bankAnswerTypes(): Map<string, { types: Set<AnswerType>; count: number }> {
  const inD2 = new Set(d2InProductNodeIds);
  const byNode = new Map<string, { types: Set<AnswerType>; count: number }>();

  for (const item of PRODUCT_ITEM_PACK) {
    if (!inD2.has(item.node_id)) {
      continue;
    }
    const entry = byNode.get(item.node_id) ?? { types: new Set<AnswerType>(), count: 0 };
    entry.types.add(item.answer.answer_spec.answer_type);
    entry.count += 1;
    byNode.set(item.node_id, entry);
  }

  return byNode;
}

describe("the population this guard measures", () => {
  it("is derived from the registry and floored, so it cannot be empty", () => {
    expect(d2InProductNodeIds.length).toBeGreaterThanOrEqual(5);
  });

  it("is exactly D2's in-product nodes — fails whichever way it and the table part", () => {
    // A floor constrains size, not shape: five of anything would clear the assertion
    // above. This pins the composition, so a node ADDED to D2 fails here (and then in
    // the coverage assertion, which would find it unauthored) and a node REMOVED fails
    // here rather than sitting in the table forever describing nothing.
    expect([...d2InProductNodeIds].sort()).toEqual(Object.keys(EXPECTED_D2).sort());
  });

  it("reads a non-empty bank for every node, so the derivation is not vacuous", () => {
    const bank = bankAnswerTypes();
    expect(bank.size).toBe(d2InProductNodeIds.length);

    let total = 0;
    for (const nodeId of d2InProductNodeIds) {
      const entry = bank.get(nodeId);
      expect(entry, `the assessment pack authors items for ${nodeId}`).toBeDefined();
      expect(entry?.count ?? 0).toBeGreaterThanOrEqual(1);
      total += entry?.count ?? 0;
    }
    expect(total).toBeGreaterThanOrEqual(d2InProductNodeIds.length);
  });

  it("authors ONE answer-type family per node, which is what makes a single archetype honest", () => {
    // The premise the derivation rests on, and it is NOT free: D2's lesson-practice
    // pool mixes text-graded answers with widget-graded `expr_builder` items, so four
    // of the five nodes are heterogeneous THERE. The assessment pack is the population
    // D1 derives from (`D1_ITEM_PACK` is its form A + form B) and it is homogeneous,
    // which is why this is the bank the D2 hook reads too.
    for (const [nodeId, entry] of bankAnswerTypes()) {
      expect([...entry.types].sort(), `one answer-type family for ${nodeId}`).toHaveLength(
        1,
      );
    }
  });
});

describe("D2 building archetypes are derived from the item-bank answer_type", () => {
  it("authors an archetype for every in-product D2 node", () => {
    const authored = getNeighborhoodDescriptor("D2").building_archetypes;
    for (const nodeId of d2InProductNodeIds) {
      expect(
        authored[nodeId],
        `D2 authors a node→building hook for ${nodeId}`,
      ).toBeDefined();
    }
    expect(Object.keys(authored).sort()).toEqual([...d2InProductNodeIds].sort());
  });

  it("leaves NO node on the generic placeholder", () => {
    // The state this replaces: `{ "RAD.4": "generic" }` and nothing else, with the
    // other four nodes falling through to `default_archetype: "generic"` as well. A
    // generic block is the fallback for a node whose answers nothing can classify; it
    // is the wrong answer for five nodes whose items are authored and frozen.
    const authored = getNeighborhoodDescriptor("D2").building_archetypes;
    for (const nodeId of d2InProductNodeIds) {
      expect(authored[nodeId], `${nodeId} is not a generic placeholder`).not.toBe(
        "generic",
      );
    }
  });

  it("matches the bank's answer_type through the SAME mapping D1 uses", () => {
    const bank = bankAnswerTypes();
    const authored = getNeighborhoodDescriptor("D2").building_archetypes;

    for (const nodeId of d2InProductNodeIds) {
      const [answerType] = [...(bank.get(nodeId)?.types ?? [])];
      if (answerType === undefined) {
        throw new Error(`the assessment pack authors no answer_type for ${nodeId}`);
      }
      // Three-way agreement: bank answer_type → shared mapping → authored archetype.
      // A hand-written literal that happens to look right fails as soon as it stops
      // agreeing with the bank, which is the whole point of deriving it.
      expect(authored[nodeId], `${nodeId} is derived, not hand-picked`).toBe(
        archetypeForAnswerType(answerType),
      );
      expect(answerType).toBe(EXPECTED_D2[nodeId]?.answer_type);
      expect(authored[nodeId]).toBe(EXPECTED_D2[nodeId]?.archetype);
    }
  });

  it("keys per node rather than painting the island one archetype", () => {
    const authored = getNeighborhoodDescriptor("D2").building_archetypes;
    const distinct = new Set(d2InProductNodeIds.map((nodeId) => authored[nodeId]));
    expect(distinct.size).toBeGreaterThan(1);
    // EXP.1 is the one `expression` node, so it is the one that must differ.
    expect(authored["EXP.1"]).toBe("constructed_response");
  });
});

describe("authoring the hook does not make a second neighborhood render", () => {
  it("still resolves D2 to an architected slot with ZERO plots", () => {
    // `resolveNeighborhood` filters to `product_scope: "mvp"`, and every D2 node is
    // `target`, so there is nothing for the archetypes to be applied TO. Marking D2
    // `populated` would trip the resolver's own fail-loud fence instead of rendering.
    const resolved = resolveNeighborhood("D2");
    expect(resolved.status).toBe("architected");
    expect(resolved.populated).toBe(false);
    expect(resolved.plots).toHaveLength(0);
  });

  it("is gated by the registry's scope, not by the descriptor", () => {
    const mvpD2 = getNodesByDomain("D2").filter((node) => node.product_scope === "mvp");
    expect(mvpD2).toHaveLength(0);
    // Floor: the gate is real because there ARE D2 nodes, all of them out of scope for
    // the resolver. An empty domain would satisfy the line above for the wrong reason.
    expect(d2InProductNodeIds.length).toBeGreaterThanOrEqual(5);
  });
});
