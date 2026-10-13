import { cityRosterNodeIds } from "@cr/game";
import {
  D1_WALK_ITEM_PACK,
  DIAGNOSTIC_WALK_SCOPE,
  diagnosticWalkScope,
} from "@cr/item-bank";
import type { PlacementEstimate, StudentNodeState } from "@cr/state-schema";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type PlacementSeed,
  UNLOCK_PLACEMENT_THRESHOLD,
} from "../diagnostic/placementRosters";
import { CitySurface } from "./CitySurface";
import { CURRENT_ERA_ID } from "./eraDressing";

/**
 * **THE REWARD SCREEN'S FRACTION IS A FRACTION OF THE ADMINISTRATION, AND IT MOVES WHEN
 * THE ADMINISTRATION DOES.**
 *
 * ## The defect, measured before it was fixed
 *
 * `UnlockCelebration`'s headline took its numerator from the tested-out list and its
 * denominator from `D1_NODE_IDS` (`getNodesByScope("mvp")` — era one's six buildings), and
 * `CitySurface` filtered the numerator through that same list on the way in. While the
 * diagnostic administered exactly those six the two agreed by coincidence.
 *
 * Driven at `2d3ad1e4` with a placement over the widened instrument's twenty nodes, four of
 * them passing (`NUM.S`, `NUM.F`, `EXP.1`, `RAD.2`), the screen read:
 *
 *     HEADLINE: You tested out of 2 of 6 skills!
 *     SUBLINE:  2 buildings free · 4 to learn.
 *
 * **Both halves were wrong.** The denominator was era one's roster rather than the twenty
 * skills the learner had just been measured over, and the numerator had silently dropped
 * `EXP.1` and `RAD.2` for being outside era one — so a learner was told they had tested out
 * of half as many skills as they had.
 *
 * ## Why a string fix is not the deliverable
 *
 * Re-pointing the denominator at `DIAGNOSTIC_WALK_SCOPE.length` would read correctly today
 * and break again on the next widening, because the two numbers would still be two reads of
 * two sources. So the assertion is a DRIFT assertion: the walk scope is changed and both
 * numbers have to move together. `diagnosticWalkScope(pack)` derives a genuinely different
 * scope from a narrowed pack through the shipped derivation, which is what makes
 * {@link SCOPES} two real instruments rather than two hand-written lists.
 *
 * ## Two claims, two sets, and the floor that keeps them apart
 *
 * The screen deliberately speaks about two different sets: the HEADLINE is the diagnostic's
 * (what was administered) and the two CARD GRIDS are the island's (what the city can
 * build). `UnlockCelebration`'s header records why the grids are not the instrument's
 * twenty — a live `<Canvas>` per card against a browser budget of roughly sixteen WebGL
 * contexts, and eight of the twenty having no building name at all.
 *
 * That is exactly the arrangement in which a "tidy-up" re-pins the headline to
 * `skips.length + learns.length` and silently restores the bug, so the distinctness is
 * asserted too — and every assertion here rests on the island roster being SMALLER than the
 * administration, which is checked first rather than assumed.
 */

const ISLAND_ROSTER = cityRosterNodeIds(CURRENT_ERA_ID);

/**
 * The two sources the structural assertions read, as text. `import.meta.glob` rather than
 * `readFileSync` because this project has no node types (see
 * `devControlsAreNotAuthGated.test.ts`, which reads the same way for the same reason).
 */
const SOURCES = import.meta.glob(
  "../{city/UnlockCelebration,diagnostic/DiagnosticRunner}.tsx",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

function sourceOf(suffix: string): string {
  const found = Object.entries(SOURCES).find(([path]) => path.endsWith(suffix));
  if (!found) {
    throw new Error(`the glob did not reach ${suffix} — this file would prove nothing`);
  }
  return found[1];
}

/**
 * Two instruments, both derived. The narrow one is what the diagnostic administered before
 * the widening, reached through the same `diagnosticWalkScope` the live scope is: a pair of
 * hardcoded id lists would prove the component can read two arrays, not that it tracks the
 * derivation.
 */
const SCOPES = {
  narrow: diagnosticWalkScope(D1_WALK_ITEM_PACK),
  wide: DIAGNOSTIC_WALK_SCOPE,
} as const;

/** A placement over `scope` with `passing` at a robust pass and everything else at 0. */
function placementOver(
  scope: readonly string[],
  passing: readonly string[],
): PlacementSeed {
  const placement: Record<string, PlacementEstimate> = {};
  for (const nodeId of scope) {
    placement[nodeId] = passing.includes(nodeId) ? 3 : 0;
  }
  return placement;
}

/** Node states for every node a placement mentions, so the city can load. */
function statesFor(placement: PlacementSeed): StudentNodeState[] {
  return [...ISLAND_ROSTER, ...Object.keys(placement)].map((nodeId) => ({
    student_id: "demo",
    node_id: nodeId,
    mastery: 0,
    lesson_stage: "not_started",
    completion_status: "not_started",
    last_practiced_at: null,
  })) as unknown as StudentNodeState[];
}

/** Mount the city on a pretest hand-off and read the reward screen back. */
async function reward(placement: PlacementSeed) {
  render(
    <CitySurface
      enableCanvas={false}
      loadCity={() =>
        Promise.resolve({ node_states: statesFor(placement), placements: [] })
      }
      onPlaceSkill={vi.fn()}
      pretestPlacement={placement}
    />,
  );
  const popup = await screen.findByRole("dialog");
  const headline = popup.querySelector("h2")?.textContent ?? "";
  const cardIds = (variant: "skip" | "learn") =>
    [...popup.querySelectorAll(`.reward-card[data-variant="${variant}"]`)].map(
      (el) => el.getAttribute("data-node-id") ?? "",
    );
  return {
    popup,
    headline,
    live: popup.querySelector("[aria-live='polite']")?.textContent ?? "",
    subline: popup.querySelector(".unlock-reward-subline")?.textContent ?? "",
    skips: cardIds("skip"),
    learns: cardIds("learn"),
  };
}

describe("the reward screen's denominator is the administration's", () => {
  it("has two instruments of different sizes to compare, and an island smaller than both", () => {
    // THE FLOOR, first, because every claim below is trivially true when these collapse.
    // A drift assertion over two scopes of the same size proves nothing at all, and the
    // headline-versus-grid distinctness is vacuous if the island already holds the whole
    // administration.
    expect(SCOPES.narrow.length, "the narrow instrument derived nothing").toBeGreaterThan(
      0,
    );
    expect(
      SCOPES.wide.length,
      `the two derived scopes are both ${SCOPES.wide.length} nodes, so nothing here measures a change of scope`,
    ).toBeGreaterThan(SCOPES.narrow.length);
    expect(
      SCOPES.wide.length,
      "the administration is no wider than this island's roster, so the two claims cannot be told apart",
    ).toBeGreaterThan(ISLAND_ROSTER.length);
    // And the wide scope really does reach past the island, which is the case the old
    // numerator dropped on the floor.
    expect(
      SCOPES.wide.filter((nodeId) => !ISLAND_ROSTER.includes(nodeId)).length,
    ).toBeGreaterThan(0);
  });

  it("reports 4 of the whole administration to a learner who tested out of 4", async () => {
    // THE INSTANCE. Two of the four passes are outside era one, which is what made the old
    // numerator read 2: `EXP.1` and `RAD.2` were filtered out for not being era one's.
    const passing = ["NUM.S", "NUM.F", "EXP.1", "RAD.2"];
    const view = await reward(placementOver(SCOPES.wide, passing));

    expect(view.headline).toBe(
      `You tested out of ${passing.length} of ${SCOPES.wide.length} skills!`,
    );
    // The literal defect, pinned as an absence rather than the fix as a literal. "2 of 6" is
    // what shipped and "4 of 6" is what a denominator-only fix would have shipped; the
    // POSITIVE assertion above is derived, because the administered count moves whenever the
    // instrument widens and a literal there would have to be re-pinned every time.
    expect(view.headline).not.toContain("of 6 skills");
    expect(view.headline).not.toContain("2 of");
    // The screen-reader summary is the same sentence and drifts the same way if left behind.
    expect(view.live).toContain(`tested out of 4 of ${SCOPES.wide.length} skills`);
  });

  it("moves BOTH numbers when the walk scope changes", async () => {
    // THE DRIFT ASSERTION. The same two passes over two derived instruments: the numerator
    // must not move (the learner passed the same two skills) and the denominator must,
    // which is only possible if the denominator is a count of the placement rather than of
    // any roster.
    const passing = ["NUM.S", "NUM.F"];
    const seen: string[] = [];
    for (const [name, scope] of Object.entries(SCOPES)) {
      const view = await reward(placementOver(scope, passing));
      seen.push(view.headline);
      expect(
        view.headline,
        `at the ${name} scope the headline denominates over something other than the ${scope.length} skills administered`,
      ).toBe(`You tested out of 2 of ${scope.length} skills!`);
      screen.getByRole("dialog").remove();
    }
    // Stated as a difference as well as two equalities, so a future implementation that
    // pins both readings to one constant fails here rather than passing both branches.
    expect(new Set(seen).size, `both scopes rendered ${seen[0]}`).toBe(2);
  });

  it("counts a tested-out skill this island has no building for", async () => {
    // The half a denominator-only fix leaves broken. `TRG.1` is era nine's; the island can
    // show no card for it, and the headline still owes the learner the credit.
    const offIsland = SCOPES.wide.filter((nodeId) => !ISLAND_ROSTER.includes(nodeId));
    expect(offIsland.length, "no administered node is off this island").toBeGreaterThan(2);
    const passing = offIsland.slice(0, 3);
    const view = await reward(placementOver(SCOPES.wide, passing));

    expect(view.headline).toBe(`You tested out of 3 of ${SCOPES.wide.length} skills!`);
    // Nothing on the island was freed, so there is no skip grid at all — which is exactly
    // the mismatch that makes the sub-line name its island.
    expect(view.skips).toEqual([]);
    expect(view.subline).toMatch(/0 buildings free on this island/);
  });

  it("keeps the grids the ISLAND's roster, so nobody re-pins the headline to them", async () => {
    const passing = ["NUM.S", "NUM.F", "EXP.1"];
    const view = await reward(placementOver(SCOPES.wide, passing));

    // The two grids partition this island's roster — derived from `@cr/game`'s own
    // `cityRosterNodeIds`, not from anything the component exports.
    expect([...view.skips, ...view.learns].sort()).toEqual([...ISLAND_ROSTER].sort());
    // …and they are NOT the headline's denominator, which is the drift this guard exists to
    // stop being re-introduced as a tidy-up.
    expect(view.skips.length + view.learns.length).toBe(ISLAND_ROSTER.length);
    expect(view.skips.length + view.learns.length).not.toBe(SCOPES.wide.length);
    // Only the passes that are on this island get a card; `EXP.1` is era two's.
    expect(view.skips).toEqual(["NUM.S", "NUM.F"]);
  });

  it("leaves no second source for the denominator in the component's props", () => {
    // The structural half. The defect was possible because the denominator arrived as its
    // own `total` prop, so the component could be handed a number that had nothing to do
    // with the numerator. It now counts the placement it is given; this fails if a
    // free-floating total is ever threaded back in.
    const source = sourceOf("/UnlockCelebration.tsx");
    const props = source.slice(
      source.indexOf("export function UnlockCelebration({"),
      source.indexOf("const dialogRef"),
    );
    expect(props.length, "the component's prop list was not found").toBeGreaterThan(200);
    expect(props).toContain("placement: PlacementSeed");
    expect(
      /\btotal\b\s*:/.test(props),
      "UnlockCelebration takes a free-standing total again, which is the shape the numerator and denominator came apart through",
    ).toBe(false);
  });

  it("agrees with the diagnostic's own results tally about the threshold", () => {
    // The two surfaces that report "you tested out of N" read one threshold from one
    // module. A second copy is how they would come to disagree about which placements count.
    expect(UNLOCK_PLACEMENT_THRESHOLD).toBe(2);
    const runner = sourceOf("/DiagnosticRunner.tsx");
    expect(runner).toContain('from "./placementRosters"');
    expect(runner).not.toMatch(/^export const UNLOCK_PLACEMENT_THRESHOLD/m);
  });
});

describe("the celebration's card grids", () => {
  it("still shows a skip card and a learn card with their names", async () => {
    const view = await reward(placementOver(SCOPES.wide, ["NUM.S"]));
    const skipList = within(view.popup).getByRole("list", {
      name: "Skills ready to build",
    });
    expect(skipList).toHaveTextContent("Signed numbers");
    expect(skipList).toHaveTextContent("Assembly Hall");
    const learnList = within(view.popup).getByRole("list", {
      name: "Skills still to learn",
    });
    expect(learnList).toHaveTextContent("Fractions");
  });
});
