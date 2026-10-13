import { describe, expect, it } from "vitest";

import {
  isToppedOut,
  MASTERY_STAR_TOTAL,
  masteryStarsFor,
  masteryTier,
} from "./masteryVisuals";
import type { BuildStage } from "./palette";

const UNDER_CONSTRUCTION: readonly BuildStage[] = ["site", "construction"];
const TOPPED_OUT: readonly BuildStage[] = ["built", "advanced"];

describe("mastery visuals — topped-out gate", () => {
  it("treats only the standing (built/advanced) building as topped out", () => {
    expect(isToppedOut("site")).toBe(false);
    expect(isToppedOut("construction")).toBe(false);
    expect(isToppedOut("built")).toBe(true);
    expect(isToppedOut("advanced")).toBe(true);
  });

  it("clamps a raw mastery value to a whole 0..3 tier", () => {
    expect(masteryTier(0)).toBe(0);
    expect(masteryTier(2)).toBe(2);
    expect(masteryTier(3)).toBe(3);
    // Out of range / non-finite fall back to the nearest valid tier.
    expect(masteryTier(-1)).toBe(0);
    expect(masteryTier(7)).toBe(3);
    expect(masteryTier(Number.NaN)).toBe(0);
    expect(masteryTier(1.4)).toBe(1);
  });
});

describe("mastery-tier → stars mapping (option A)", () => {
  it("shows NO stars while the building is under construction", () => {
    for (const stage of UNDER_CONSTRUCTION) {
      for (let mastery = 0; mastery <= 3; mastery += 1) {
        expect(masteryStarsFor(mastery, stage), `${stage}/${mastery}`).toBeNull();
      }
    }
  });

  it("fills X of 3 stars for the mastery tier once the building tops out", () => {
    for (const stage of TOPPED_OUT) {
      for (let mastery = 0; mastery <= 3; mastery += 1) {
        const stars = masteryStarsFor(mastery, stage);
        expect(stars, `${stage}/${mastery}`).not.toBeNull();
        expect(stars?.total).toBe(MASTERY_STAR_TOTAL);
        expect(stars?.filled).toBe(mastery);
      }
    }
  });

  it("turns gold + celebratory only at full mastery (3/3)", () => {
    expect(masteryStarsFor(2, "advanced")?.celebratory).toBe(false);
    expect(masteryStarsFor(3, "advanced")?.celebratory).toBe(true);
    // A partly-mastered, freshly-built node shows empty slots, never celebratory.
    expect(masteryStarsFor(0, "built")).toMatchObject({ filled: 0, celebratory: false });
    expect(masteryStarsFor(1, "built")).toMatchObject({ filled: 1, celebratory: false });
  });
});
