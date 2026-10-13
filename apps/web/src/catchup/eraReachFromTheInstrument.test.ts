import {
  D1_WALK_ITEM_PACK,
  DIAGNOSTIC_WALK_SCOPE,
  diagnosticWalkScope,
  PRODUCT_ITEM_PACK,
} from "@cr/item-bank";
import { ERA_SEQUENCE, eraNumber } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { UNLOCK_PLACEMENT_THRESHOLD } from "../diagnostic/placementRosters";
import { eraFires, eraPlacementFromSeed } from "./eraPlacement";

/**
 * **HOW DEEP THE LIVE INSTRUMENT CAN ACTUALLY PLACE A LEARNER.**
 *
 * `eraPlacement.test.ts` asserts that the era decision reads the SHAPE of a placement and
 * never its scope, and is deliberately written to stay green whatever the diagnostic
 * administers — its own docblock says so, because the widening was in flight when it landed.
 * That is the right property for that file and it leaves one question unasked: what the reader
 * returns when it is handed the placement the SHIPPED instrument can actually produce.
 *
 * This is that question, and it is the one Friday's demo turns on. The demo's subject is
 * choosing your era from your diagnostic result, so an era no result can reach is a hole in the
 * middle of it.
 *
 * ## Why the answer is a fact about the SCOPE
 *
 * An era fires only when every one of its nodes passed. A node the instrument never probes is
 * absent from `placement_by_node`, absent reads as `0`, and `0` is below the pass bar — so an
 * era with an unadministered node **can never fire, for anybody**. And the scan stops at the
 * first era that does not fire (§10.9's prefix property), so the deepest era anyone can be
 * placed into is the first era the instrument cannot fully serve.
 *
 * The learner modelled here is therefore the BEST CASE and not a typical one: they pass
 * everything the instrument asks. If they cannot reach an era, nobody can.
 *
 * ## The comparison is derived, not remembered
 *
 * `NARROWER_SCOPE` runs the shipped derivation over the two packs authored FOR the walk —
 * D1's and the product spine's — which is exactly the instrument before this lane's
 * practice-derived pack. So "it used to be the third era" is recomputed on every run rather
 * than quoted, and it fails if that stops being true.
 */

/** A placement in which every node of `scope` passed — the best case for that instrument. */
function everythingAdministeredPasses(scope: readonly string[]): Record<string, number> {
  return Object.fromEntries(scope.map((nodeId) => [nodeId, UNLOCK_PLACEMENT_THRESHOLD]));
}

/** The instrument before the practice-derived pack: the derivation over the walk-authored packs. */
const NARROWER_SCOPE = diagnosticWalkScope([...D1_WALK_ITEM_PACK, ...PRODUCT_ITEM_PACK]);

/** How deep an instrument of this scope can place its best-case learner. */
function deepestReachableEra(scope: readonly string[]): number {
  return eraNumber(eraPlacementFromSeed(everythingAdministeredPasses(scope)).placedEra);
}

describe("how deep the live instrument can place a learner", () => {
  it("has two instruments of different widths to compare", () => {
    // THE FLOOR. Both claims below are about a difference, and a difference between two equal
    // things is not a finding. Derived on both sides, so neither is a remembered number.
    expect(ERA_SEQUENCE.length).toBe(10);
    expect(NARROWER_SCOPE.length).toBeGreaterThan(0);
    expect(
      DIAGNOSTIC_WALK_SCOPE.length,
      "the live scope is no wider than the walk-authored packs, so this lane added nothing",
    ).toBeGreaterThan(NARROWER_SCOPE.length);
  });

  /**
   * **THE BEST CASE NOW CLEARS THE GAME, and that is a different outcome rather than a deeper
   * one.** A learner who passes everything the instrument asks used to LAND in an era, because
   * some era ahead of them held a node nobody could be measured on. There is no such era: with
   * `POL.5` authored the instrument administers all sixty-two nodes, every era fires, and the
   * scan runs off the end of `ERA_SEQUENCE`.
   *
   * So the reading `eraPlacementFromSeed` returns is `clearedEverything`, which is the branch
   * this file could not previously reach at all. It is asserted as its own claim rather than
   * folded into an era number, because "placed into the tenth era" and "cleared the tenth era"
   * are different results and only one of them is true.
   */
  it("clears every era for a best-case learner, so there is nowhere left to place them", () => {
    const placement = eraPlacementFromSeed(
      everythingAdministeredPasses(DIAGNOSTIC_WALK_SCOPE),
    );
    expect(placement.clearedEverything).toBe(true);
    // A learner has to stand somewhere, so `eraPlacementFromSeed` puts them in the LAST era and
    // hands over the nine before it. That is the `clearedEverything` contract rather than an
    // off-by-one: the skipped set is the eras walked, and nobody walks the one they are in.
    const last = ERA_SEQUENCE[ERA_SEQUENCE.length - 1];
    expect(placement.placedEra).toBe(last?.id);
    // The nine, as the actual list rather than a count, because a count of nine is met by any
    // nine and the prefix property makes the ORDER the claim.
    expect([...placement.skipped]).toEqual(ERA_SEQUENCE.slice(0, -1).map((era) => era.id));
    // And the era they stand in genuinely holds nodes, so "cleared everything" cannot be
    // satisfied by a sequence that ends in an era with nothing to fire on.
    expect(last?.nodes.length).toBeGreaterThan(0);
  });

  it("could only reach the THIRD era before this lane's pack, measured not remembered", () => {
    // The finding, recomputed. Derived from the shipped derivation over the shipped packs
    // rather than pinned, on both sides.
    expect(deepestReachableEra(NARROWER_SCOPE)).toBe(3);
    // `eraNumber` of a cleared game is the count of eras, since the scan passed all of them.
    expect(deepestReachableEra(DIAGNOSTIC_WALK_SCOPE)).toBe(ERA_SEQUENCE.length);
    // And it is a strict improvement rather than a trade: every era the narrower instrument
    // could hand over, the wider one still can.
    const before = eraPlacementFromSeed(everythingAdministeredPasses(NARROWER_SCOPE));
    const after = eraPlacementFromSeed(everythingAdministeredPasses(DIAGNOSTIC_WALK_SCOPE));
    for (const eraId of before.skipped) {
      expect(after.skipped, `${eraId} stopped being reachable`).toContain(eraId);
    }
    expect(after.skipped.length).toBeGreaterThan(before.skipped.length);
  });

  /**
   * The other half, which used to be the honest limit and is now the honest completeness.
   *
   * This assertion has named two different pairs of nodes. It was `POL.6` and `POL.7` stopping
   * the sixth era, after `GEO.1` and `GEO.2` stopped it and were authored; it then should have
   * been `POL.5` stopping the seventh, which is the state this file was left in unedited when
   * `POL.6` and `POL.7` landed. There is no such node now, so the claim is that EVERY era's
   * nodes are administered, per era and by name, which is what the naming was for.
   */
  it("leaves no era with a node the instrument cannot reach", () => {
    const placement = everythingAdministeredPasses(DIAGNOSTIC_WALK_SCOPE);
    for (const era of ERA_SEQUENCE) {
      const unreached = era.nodes.filter(
        (nodeId) => !DIAGNOSTIC_WALK_SCOPE.includes(nodeId),
      );
      expect(
        unreached,
        `era ${eraNumber(era.id)} (${era.id}) has unreachable nodes`,
      ).toEqual([]);
      expect(era.nodes.length, `era ${era.id} is empty`).toBeGreaterThan(0);
    }
    // The four ids this assertion has named over its life, still in, so the history it records
    // stays checkable rather than becoming a paragraph.
    for (const nodeId of ["GEO.1", "GEO.2", "POL.6", "POL.7", "POL.5"]) {
      expect(DIAGNOSTIC_WALK_SCOPE, `${nodeId} left the instrument`).toContain(nodeId);
    }
  });

  it("fires every era, including the last", () => {
    const placement = everythingAdministeredPasses(DIAGNOSTIC_WALK_SCOPE);
    for (const era of ERA_SEQUENCE) {
      expect(eraFires(era.id, placement), `era ${eraNumber(era.id)} (${era.id})`).toBe(
        true,
      );
    }
    // And the narrower instrument still cannot, so this is a measurement of the widening rather
    // than of a reader that says yes to everything.
    const narrow = everythingAdministeredPasses(NARROWER_SCOPE);
    expect(
      ERA_SEQUENCE.filter((era) => eraFires(era.id, narrow)).length,
      "the narrower instrument fires every era too, so `eraFires` is not discriminating",
    ).toBeLessThan(ERA_SEQUENCE.length);
  });
});
