import { ERA_SEQUENCE, skillGraph } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { CIVIC_CATALOGUE } from "./civicCatalogue";
import { lessonCompleteEventId } from "./events";

/**
 * **THE IDS THE PRODUCT ACTUALLY BUILDS, RUN THROUGH THE RULE THAT REJECTS THEM.**
 *
 * `assertPart` (`events.ts`) refuses an empty or colon-bearing part, because colon is the
 * delimiter in every `event_id`. Defect D-1 was one production string that broke that
 * rule, and it survived four days because of WHERE the guards sat rather than what they
 * asserted: `events.test.ts` proves the rule over hand-written literals, and the
 * surfaces that mint real ids were only ever asserted against mocks. Both were green
 * over a product that paid nothing.
 *
 * So this file asks the one question neither asked: **is every string the shipped data
 * feeds into an event id acceptable to the builder that consumes it?** The values are
 * derived from the shipped registries, never written down here — a literal would rebuild
 * the hole.
 *
 * ## Which populations, and why these
 *
 * Enumerated from the builders in `events.ts` and their production inputs, so the
 * populations are chosen by where an id part comes FROM rather than by what is easy to
 * iterate:
 *
 * | Builder | Part | Population here |
 * | --- | --- | --- |
 * | `lessonCompleteEventId` | node id | every era's node list, and the whole graph |
 * | `interleavedEventId` | session id | minted at runtime — covered by `interleavedPayoutSeam.test.tsx` |
 * | `repairEventIdFor` | damage id, kind, subject | minted at runtime — covered by `crisisRepairRecovery.test.ts` |
 * | `buildEventIdFor` | placement id | **nothing reaches this builder** (defect D-2), so the catalogue ids a producer would key on are checked instead |
 *
 * The two runtime-minted rows are named rather than omitted: an id that only exists
 * while a learner is playing cannot be enumerated from data, so its guard has to drive
 * the surface that mints it. Those two exist and are cited. Leaving them unnamed is how
 * a table like this comes to look complete while covering the ids that were never the
 * risk.
 *
 * ## TWO ROWS LEFT THE TABLE WITH THE SUNSET, and the table shrank with them
 *
 * `starEventId` (node id + level) and `purchaseEventId` (cosmetic id) were rows here
 * until 2026-08-03. Both builders are deleted — there is no XP for a star to credit and
 * no shop to buy from — so their populations are not merely empty, they have no consumer
 * at all. The `COSMETIC_CATALOG` derivation went with them rather than staying as a
 * sweep over an array that no longer exists.
 */

/** Every node id any era can pay a lesson or a star for. */
const ERA_NODE_IDS: readonly string[] = [
  ...new Set(ERA_SEQUENCE.flatMap((era) => era.nodes)),
];

/** Every node id in the registry — a superset, and what `deriveEarnEvents` may see. */
const GRAPH_NODE_IDS: readonly string[] = [
  ...new Set(skillGraph.nodes.map((node) => node.id)),
];

const CIVIC_IDS: readonly string[] = CIVIC_CATALOGUE.map((building) => building.id);

describe("every node id the game can pay for is an acceptable event-id part", () => {
  it("covers all ten eras and the whole graph, not one era's six", () => {
    // THE POPULATION'S SHAPE, asserted before anything is claimed over it. Era one's
    // six node ids are the only ones any existing test drives through the real grant
    // path (`useEconomy.test.tsx` over `D1_NODE_IDS`), which is exactly the narrowness
    // that let D-1 hide: a rule that holds for what is tested says nothing about the
    // rest. A floor alone would be satisfied by era one repeated ten times, so the era
    // census sits beside it.
    expect(new Set(ERA_SEQUENCE.map((era) => era.id)).size).toBe(10);
    expect(ERA_NODE_IDS.length).toBeGreaterThanOrEqual(62);
    // The graph is the wider source, so it must not be the narrower list. If this
    // inverts, the derivation below is reading the wrong registry.
    expect(GRAPH_NODE_IDS.length).toBeGreaterThanOrEqual(ERA_NODE_IDS.length);
    // And every era genuinely contributes: an era whose node list emptied would
    // otherwise slip through the totals above.
    for (const era of ERA_SEQUENCE) {
      expect(era.nodes.length, `${era.id} contributes no nodes`).toBeGreaterThan(0);
    }
  });

  it("builds a row 1 id for every one of them without throwing", () => {
    const nodeIds = [...new Set([...ERA_NODE_IDS, ...GRAPH_NODE_IDS])];
    // A floor under the loop, so an empty registry read cannot pass as a clean sweep.
    expect(nodeIds.length).toBeGreaterThanOrEqual(62);
    for (const nodeId of nodeIds) {
      expect(() => lessonCompleteEventId(nodeId), nodeId).not.toThrow();
      expect(lessonCompleteEventId(nodeId)).toBe(`lesson_complete:${nodeId}`);
      // The round trip, which is what "acceptable" has to mean: the id splits back into
      // its kind and its part. A part carrying a delimiter would split into three.
      expect(lessonCompleteEventId(nodeId).split(":")).toHaveLength(2);
    }
  });
});

describe("every civic building id is safe for the purchase path D-2 has not built", () => {
  it("is all forty rows, across all ten eras", () => {
    expect(CIVIC_IDS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(CIVIC_IDS).size).toBe(CIVIC_IDS.length);
    expect(new Set(CIVIC_CATALOGUE.map((building) => building.era)).size).toBe(10);
  });

  it("keeps them event-id safe, so wiring a buy action cannot reintroduce D-1", () => {
    // HONEST SCOPE: `buildEventIdFor` keys on a PLACEMENT id, and nothing reaches it,
    // because `applyCivicPurchase` still has no caller (defect D-2) — including on
    // PR #273, which makes era one's four types buyable but records the spend in a city
    // session counter rather than the ledger, and says so in `civicEconomy.ts`. So this
    // is a pre-condition on a path that does not exist yet rather than a claim about a
    // live one. #273 does mint a placement id (`civicPlacementId`); when a spend finally
    // is keyed on one, these are the strings it will be derived from, and D-1 is what
    // happens when that deriving lands somewhere no guard is looking.
    for (const buildingId of CIVIC_IDS) {
      expect(buildingId).not.toContain(":");
      expect(buildingId.length).toBeGreaterThan(0);
    }
  });
});
