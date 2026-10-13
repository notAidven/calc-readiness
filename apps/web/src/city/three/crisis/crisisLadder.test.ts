import { ERA_SEQUENCE } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { CURRENT_ERA_ID } from "../../eraDressing";
import { roadStackTop } from "../Roads";
import { GROUND_DECAL_STEP } from "../StarterIsland";
import { winterCourseTop } from "../WinterGround";
import { crisisCourseTop, crisisGroundLadder } from "./ladder";
import { CRISIS_ENTRIES } from "./registry";

/**
 * **THE SHARED GROUND-DECAL LADDER: era one already sits on it, and era four declines it.**
 *
 * Two claims, and the second is as important as the first. `crises/README.md` calls this ladder
 * *"the cheapest place in the whole renderer to put new art"*, which is true and made it easy to
 * assume every crisis would take it. Era four does not, and the guard says so rather than leaving
 * the assumption in a docblock.
 *
 * ## WHY THE ERA-ONE HALF IS AN AGREEMENT ASSERTION AND NOT A DELEGATION
 *
 * `winterCourseTop` still computes the ladder itself inside `WinterGround.tsx`.
 * #407 is open over that file, so this
 * pass does not edit it. Asserting the two agree rung for rung proves the extraction is correct
 * without making it, and it is the assertion that would catch the delegation going in wrong once
 * #407 lands.
 */

/** Rungs to compare over. Era one's own ladder runs to 14; this reaches well past it. */
const RUNGS = Array.from({ length: 24 }, (_, i) => i);

describe("era one already stands on the shared ladder", () => {
  it("agrees with winterCourseTop rung for rung", () => {
    // Not `toBeCloseTo`. The two are the same arithmetic over the same inputs, so anything but
    // exact equality means one of them has picked up a term the other has not.
    for (const rung of RUNGS) {
      expect(crisisCourseTop(CURRENT_ERA_ID, rung), `rung ${rung}`).toBe(
        winterCourseTop(rung),
      );
    }
    // A floor, because an empty comparison is a true one.
    expect(RUNGS).toHaveLength(24);
  });

  it("is a genuine generalisation, not the same constant under another name", () => {
    // The era parameter has to DO something, or `crisisCourseTop` is `winterCourseTop` with an
    // ignored argument. It does: the ladder starts from that era's own road stack top, so an era
    // that surfaces its roads differently gets a different ladder.
    const erasWithRoadStacks = ERA_SEQUENCE.map((era) => era.id).filter((eraId) => {
      try {
        roadStackTop(eraId);
        return true;
      } catch {
        return false;
      }
    });
    expect(erasWithRoadStacks.length).toBeGreaterThanOrEqual(2);
    for (const eraId of erasWithRoadStacks) {
      expect(crisisCourseTop(eraId, 0), eraId).toBe(
        roadStackTop(eraId) + GROUND_DECAL_STEP,
      );
    }
    // At least one era's ladder differs from era one's, so the parameter is load-bearing.
    const distinct = new Set(erasWithRoadStacks.map((eraId) => crisisCourseTop(eraId, 0)));
    expect(distinct.size).toBeGreaterThanOrEqual(2);
  });
});

describe("the ladder is uniform and starts above the roads", () => {
  it("steps by exactly one rung, every rung", () => {
    const ladder = crisisGroundLadder(CURRENT_ERA_ID);
    expect(ladder.step).toBe(GROUND_DECAL_STEP);
    for (const rung of RUNGS.slice(0, -1)) {
      // Floating point: the rungs are accumulated multiplications, so compare the step rather
      // than the absolute, and allow the last bit.
      expect(ladder.top(rung + 1) - ladder.top(rung), `rung ${rung}`).toBeCloseTo(
        GROUND_DECAL_STEP,
        10,
      );
    }
  });

  it("puts the lowest crisis rung above the highest road face", () => {
    // The defect `Roads.tsx`'s own note documents: a second ladder over one ground plane. Frost
    // falls on paved cells too, so a crisis course under the road stack is a crisis the player
    // cannot see on the half of the board they built on.
    const ladder = crisisGroundLadder(CURRENT_ERA_ID);
    expect(ladder.top(0)).toBeGreaterThan(roadStackTop(CURRENT_ERA_ID));
  });
});

describe("the ladder is a seam a crisis may take and not one it must", () => {
  it("records era four laying no ground layer, with the reason", () => {
    // The starting hypothesis for this pass listed the decal ladder as shared by all four. It is
    // not, and this is where that was checked rather than assumed: era four's brief rules a
    // ground layer OUT, so the row comes back `no-analogue` with a because.
    const succession = CRISIS_ENTRIES.find((entry) => entry.eraId === "classical");
    if (!succession) {
      throw new Error("era four is expected in the registry");
    }
    const ground = succession.mechanics.M5;
    expect(ground.kind).toBe("no-analogue");
    if (ground.kind !== "no-analogue") {
      throw new Error("unreachable");
    }
    expect(ground.because).toContain("no ground layer");
    expect(ground.because.length).toBeGreaterThan(80);
  });

  it("records era one taking it, so the contrast is not vacuous", () => {
    const winter = CRISIS_ENTRIES.find((entry) => entry.eraId === "prehistoric");
    if (!winter) {
      throw new Error("era one is expected in the registry");
    }
    expect(winter.mechanics.M5.kind).toBe("shared-seam");
    expect(winter.mechanics.M19.kind).toBe("shared-seam");
  });
});
