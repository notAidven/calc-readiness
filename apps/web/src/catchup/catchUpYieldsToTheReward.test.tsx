import { DIAGNOSTIC_WALK_SCOPE } from "@cr/item-bank";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CitySurface } from "../city/CitySurface";
import type { PlacementSeed } from "../diagnostic/placementRosters";
import { UNLOCK_PLACEMENT_THRESHOLD } from "../diagnostic/placementRosters";
import { eraPlacementFromSeed } from "./eraPlacement";

/**
 * **TWO MODALS DO NOT STACK ON FIRST ENTRY: THE CATCH-UP YIELDS TO THE DIAGNOSTIC REWARD.**
 *
 * `CitySurface` already holds this rule for the in-play unlock popup and the onboarding reel —
 * *"yields to the once-only diagnostic reward and the onboarding reel so two popups can never
 * stack on first entry"* — and the test-out catch-up did not, which nothing noticed for a
 * structural reason worth recording.
 *
 * The two surfaces arrived as SEPARATE props from separate lanes: the reward took a flattened
 * `unlockedNodeIds` and the walk took a raw `catchUpPlacementByNode`. `App` set both from the
 * same hand-off, so a learner who tested out of the whole of era one got the walk's prompt drawn
 * over the celebration — but no test set both props, so no test could see it. Unifying them onto
 * one `pretestPlacement` made it a visible failure in six existing tests at once.
 *
 * It also stopped being an edge case. Only era one could fire while the instrument administered
 * twenty nodes; eras one to five can fire at thirty-four, so the collision moved from rare to
 * ordinary on exactly the path Friday's demo takes.
 *
 * The population here is the two surfaces themselves, which is the whole of it — this is a claim
 * about one pair, and a sweep would be an affectation.
 */

/** A placement in which every administered node passed: the best case, and the collision case. */
function everythingPasses(): PlacementSeed {
  return Object.fromEntries(
    DIAGNOSTIC_WALK_SCOPE.map((nodeId) => [nodeId, UNLOCK_PLACEMENT_THRESHOLD]),
  ) as PlacementSeed;
}

function renderCity(placement: PlacementSeed) {
  return render(
    <CitySurface
      enableCanvas={false}
      reducedMotion
      loadCity={() => Promise.resolve({ node_states: [], placements: [] })}
      onPlaceSkill={vi.fn()}
      pretestPlacement={placement}
    />,
  );
}

describe("the catch-up yields to the diagnostic reward", () => {
  it("has a placement that would open both, so the ordering claim has a subject", async () => {
    // THE FLOOR, and it is the assertion that makes every line below non-vacuous: this
    // placement really does satisfy both surfaces' own conditions independently.
    const placement = everythingPasses();
    expect(Object.keys(placement).length).toBeGreaterThanOrEqual(62);
    // The reward's condition: something was tested out.
    expect(
      Object.values(placement).filter((level) => level >= UNLOCK_PLACEMENT_THRESHOLD)
        .length,
    ).toBeGreaterThan(0);
    // The walk's condition: at least one age is handed over. Every age but the last, now that
    // the instrument administers all sixty-two nodes and a best-case learner clears the
    // sequence: `eraPlacementFromSeed` stands them in the final era and hands over the nine
    // before it. Derived from `ERA_SEQUENCE` rather than pinned at nine, so the count moves
    // with the sequence and the assertion stays about the SHAPE, which is that the collision
    // this file is about is at its widest rather than absent.
    const era = eraPlacementFromSeed(placement);
    expect(era.skipped.length, "no age is handed over, so nothing would collide").toBe(
      ERA_SEQUENCE.length - 1,
    );
    expect([...era.skipped]).toEqual(ERA_SEQUENCE.slice(0, -1).map((e) => e.id));
    expect(era.clearedEverything).toBe(true);
  });

  it("shows the reward first and holds the walk back", async () => {
    renderCity(everythingPasses());
    await screen.findByRole("button", { name: "Build" });

    // The reward is up…
    expect(
      await screen.findByRole("button", { name: "Start building" }),
    ).toBeInTheDocument();
    // …and the walk is not, which is the defect this file exists for: before the yield, both
    // rendered and `getByRole("dialog")` found two.
    expect(screen.queryByTestId("catchup-prompt")).toBeNull();
  });

  it("opens the walk once the reward is dismissed", async () => {
    renderCity(everythingPasses());
    await screen.findByRole("button", { name: "Build" });
    fireEvent.click(screen.getByRole("button", { name: "Start building" }));

    // Hear what the diagnostic found, then walk the ages it handed over — in that order, and
    // without the learner losing the walk by pressing through the reward.
    const prompt = await screen.findByTestId("catchup-prompt");
    expect(prompt.getAttribute("data-era")).toBe(ERA_SEQUENCE[0]?.id);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Start building" })).toBeNull(),
    );
  });

  it("opens the walk immediately when the reward has nothing to say", async () => {
    // The control. A placement that hands ages over but tested nothing out is not a real
    // diagnostic result, and it is the case that proves the yield is a YIELD rather than a
    // blanket suppression: with no reward to show, the walk is not waiting for anything.
    const placement = Object.fromEntries(
      DIAGNOSTIC_WALK_SCOPE.map((nodeId) => [nodeId, 0]),
    ) as PlacementSeed;
    renderCity(placement);
    await screen.findByRole("button", { name: "Build" });
    expect(screen.queryByRole("button", { name: "Start building" })).toBeNull();
    // Nothing passed, so no age fires and there is no walk either — which is the honest
    // outcome and is asserted rather than left as an absence with two possible causes.
    expect(eraPlacementFromSeed(placement).skipped).toEqual([]);
    expect(screen.queryByTestId("catchup-prompt")).toBeNull();
  });
});
