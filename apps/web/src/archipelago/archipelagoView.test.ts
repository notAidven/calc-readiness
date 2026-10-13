import { ERA_MATERIALS, type MaterialBalances } from "@cr/economy";
import { ERA_SEQUENCE, type EraId, getEraNodes } from "@cr/skill-graph";
import type { Mastery, StudentNodeState, UUID } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { ERA_MASTERED_MASTERY } from "../city/eraTimelineView";
import {
  type ArchipelagoIslandState,
  archipelagoView,
  DISTANT_FROM_AHEAD,
  HORIZON_FROM_AHEAD,
  islandStateFor,
  storesOn,
} from "./archipelagoView";

/**
 * **THE OVERVIEW'S VIEW MODEL, against §568 §5, §7 and §8.5.**
 *
 * Three claims, each of which is a ruling rather than a preference:
 *
 *  1. **The haze is keyed to SEQUENCE distance and to nothing else** (§5). The property is
 *     tested as an absence — no camera, no viewport and no projection is an argument to
 *     {@link islandStateFor} — and as a behaviour: the same era reads a different state from
 *     two different standing points, and the same standing point reads the same state whatever
 *     else changes.
 *  2. **Exactly one island opens a door, and it is the one the learner is standing on** (§7,
 *     corrected). Swept over every position in the run rather than asserted once, because the
 *     defect this rules out is a past island growing an entry affordance — which would show up
 *     at one position and not at another.
 *  3. **A completed island's stores read as a place, not a shortfall** (§8.5).
 */

const STUDENT = "test-student" as UUID;

function state(nodeId: string, mastery: Mastery): StudentNodeState {
  return {
    student_id: STUDENT,
    node_id: nodeId,
    placement_estimate: 0,
    mastery,
    mastery_updated_at: null,
    completion_status: "in_progress",
    lesson_stage: "not_started",
    last_practiced_at: null,
  };
}

/** Every node of every era up to and including `through`, at the mastered bar. */
function masteredThrough(through: EraId): readonly StudentNodeState[] {
  const upTo = ERA_SEQUENCE.findIndex((era) => era.id === through);
  return ERA_SEQUENCE.slice(0, upTo + 1).flatMap((era) =>
    getEraNodes(era.id).map((nodeId) => state(nodeId, ERA_MASTERED_MASTERY)),
  );
}

function viewStandingIn(eraId: EraId, materials: MaterialBalances = {}) {
  return archipelagoView({ nodeStates: [], liveEraId: eraId, materials });
}

describe("the five states are keyed to sequence distance", () => {
  it("takes NOTHING but how far ahead an island is", () => {
    // §5: "a distance-keyed fog resolves the moment a learner pans toward the far end, which
    // would let them count; a sequence-keyed treatment does not." The property is that this
    // function has one argument and it is an integer, so a camera cannot reach it.
    expect(islandStateFor.length).toBe(1);
  });

  it("walks §5's five bands", () => {
    const bands: readonly [number, ArchipelagoIslandState][] = [
      [-9, "completed"],
      [-1, "completed"],
      [0, "current"],
      [1, "next"],
      [2, "distant"],
      [4, "distant"],
      [5, "horizon"],
      [9, "horizon"],
    ];
    for (const [ahead, expected] of bands) {
      expect(islandStateFor(ahead)).toBe(expected);
    }
    expect(DISTANT_FROM_AHEAD).toBe(2);
    expect(HORIZON_FROM_AHEAD).toBe(5);
  });

  it("reads the same era differently from two standing points, which is the whole claim", () => {
    const fromEraOne = viewStandingIn("prehistoric").islands;
    const fromEraSix = viewStandingIn("renaissance").islands;
    const atomic = (islands: typeof fromEraOne) =>
      islands.find((island) => island.eraId === "atomic_age");
    // Era eight is three ahead of era five's neighbour and two behind era ten's; from era one
    // it is over the horizon and from era six it is a place.
    expect(atomic(fromEraOne)?.state).toBe("horizon");
    expect(atomic(fromEraSix)?.state).toBe("distant");
  });

  it("puts every era ahead of the learner in a locked state and nothing behind", () => {
    for (const era of ERA_SEQUENCE) {
      const view = viewStandingIn(era.id);
      for (const island of view.islands) {
        expect(island.locked).toBe(island.ahead > 0);
        expect(island.locked).toBe(
          island.state === "next" ||
            island.state === "distant" ||
            island.state === "horizon",
        );
      }
      expect(view.unlockedCount).toBe(view.currentNumber);
    }
  });
});

describe("stage 1 opens a card on a past island, not a door", () => {
  it("gives exactly one island an entry affordance, at every point in the run", () => {
    for (const era of ERA_SEQUENCE) {
      const view = viewStandingIn(era.id);
      const doors = view.islands.filter((island) => island.opens === "enter");
      expect(doors).toHaveLength(1);
      expect(doors[0]?.eraId).toBe(era.id);
      expect(doors[0]?.state).toBe("current");
    }
  });

  it("gives a COMPLETED island a card, which is the correction §7 makes", () => {
    const view = viewStandingIn("medieval");
    const behind = view.islands.filter((island) => island.state === "completed");
    expect(behind.length).toBe(4);
    for (const island of behind) {
      expect(island.opens).toBe("card");
    }
  });

  it("gives a locked island a card too, so nothing ahead reads as enterable", () => {
    const view = viewStandingIn("neolithic");
    for (const island of view.islands.filter((entry) => entry.locked)) {
      expect(island.opens).toBe("card");
    }
  });
});

describe("what an island still holds", () => {
  it("reads '80 stone here', which is §8.5's framing and not a shortfall", () => {
    const stores = storesOn("prehistoric", { stone: 80 });
    expect(stores?.line).toBe("80 stone here");
    expect(stores?.amount).toBe(80);
    expect(stores?.material).toBe("stone");
  });

  it("names each era's OWN material, because the wallet is already era-denominated", () => {
    // §8.2: "material is already era-denominated ... ERA_MATERIALS gives each era its own
    // resource". So a balance on era three cannot be reported against era one's noun.
    for (const era of ERA_SEQUENCE) {
      const material = ERA_MATERIALS[era.id].material;
      const stores = storesOn(era.id, { [material.id]: 12 });
      expect(stores?.line).toBe(`12 ${material.display_name.toLowerCase()} here`);
    }
  });

  it("says nothing at all where an island holds nothing", () => {
    expect(storesOn("prehistoric", {})).toBeNull();
    expect(storesOn("prehistoric", { stone: 0 })).toBeNull();
  });

  it("puts each island's own balance on it, and never the live era's", () => {
    // The defect this rules out is reading `WalletView.spendable`, which would report the
    // same number ten times. Era one holds 80 stone and era two holds 240 grain, and the
    // learner is standing in era two.
    const view = viewStandingIn("neolithic", { stone: 80, grain: 240 });
    const line = (eraId: EraId) =>
      view.islands.find((island) => island.eraId === eraId)?.stores?.line ?? null;
    expect(line("prehistoric")).toBe("80 stone here");
    expect(line("neolithic")).toBe("240 grain here");
    expect(line("bronze_age")).toBeNull();
  });

  it("refuses to put a stockpile on an island the learner has not reached", () => {
    // A dev-advanced or seeded session can carry a balance in a material whose era is still
    // locked; a map that reported it would be telling the learner about an era they have not
    // unlocked, off a number no ordinary run can produce.
    const view = viewStandingIn("prehistoric", { stone: 80, gold: 5000 });
    expect(
      view.islands.find((island) => island.eraId === "prehistoric")?.stores?.line,
    ).toBe("80 stone here");
    for (const island of view.islands.filter((entry) => entry.locked)) {
      expect(island.stores).toBeNull();
    }
  });
});

describe("the map and the Timeline are one derivation", () => {
  it("takes mastery from the same rows the Timeline reads", () => {
    const view = archipelagoView({
      nodeStates: masteredThrough("prehistoric"),
      liveEraId: "neolithic",
    });
    const eraOne = view.islands[0];
    expect(eraOne?.masteredCount).toBe(eraOne?.nodeCount);
    expect(view.islands[1]?.masteredCount).toBe(0);
  });

  it("follows the STANDING era rather than mastery, as `withLiveEra` rules", () => {
    // A dev-driven advance leaves an era behind the city with nodes unmastered. The marker
    // has to be where the city is, and the mastery count has to stay honest about the learner.
    const view = archipelagoView({ nodeStates: [], liveEraId: "classical" });
    expect(view.currentEraId).toBe("classical");
    expect(view.currentNumber).toBe(4);
    expect(view.islands[0]?.state).toBe("completed");
    expect(view.islands[0]?.masteredCount).toBe(0);
  });

  it("stands a fully mastered learner on era ten rather than nowhere", () => {
    // `buildEraTimeline` answers `currentNumber: null` on a finished run, which is right for a
    // list and would leave a map with no island to go back into.
    const view = archipelagoView({ nodeStates: masteredThrough("cyberpunk") });
    expect(view.currentEraId).toBe("cyberpunk");
    expect(view.currentNumber).toBe(10);
    expect(view.islands.filter((island) => island.opens === "enter")).toHaveLength(1);
  });

  it("seats every era in the bay, with a name and a concept for each", () => {
    const view = viewStandingIn("prehistoric");
    expect(view.islands).toHaveLength(ERA_SEQUENCE.length);
    for (const island of view.islands) {
      expect(island.name.length).toBeGreaterThan(0);
      expect(island.concept.length).toBeGreaterThan(0);
      expect(island.nodeCount).toBeGreaterThan(0);
    }
  });
});
