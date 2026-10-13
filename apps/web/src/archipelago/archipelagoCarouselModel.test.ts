import { ERA_SEQUENCE } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  ARCHIPELAGO_NAV_INPUTS,
  commandCarousel,
  initialCarouselState,
  settleCarousel,
} from "./archipelagoCarouselModel";

describe("the pure selected-island command", () => {
  it("keeps requested, rendered, and standing indices separate", () => {
    const opened = initialCarouselState(3);
    expect(opened).toMatchObject({
      requestedIndex: 3,
      renderedIndex: 3,
      standingIndex: 3,
    });

    const requested = commandCarousel(opened, { type: "step", delta: 1 }, "right-key");
    expect(requested).toMatchObject({
      requestedIndex: 4,
      renderedIndex: 3,
      standingIndex: 3,
    });

    const replaced = commandCarousel(requested, { type: "step", delta: 1 }, "right-key");
    expect(replaced).toMatchObject({
      requestedIndex: 5,
      renderedIndex: 3,
      standingIndex: 3,
    });
    expect(settleCarousel(replaced)).toMatchObject({
      requestedIndex: 5,
      renderedIndex: 5,
      standingIndex: 3,
    });
  });

  it("clamps at both ends, supports first/last, and never changes standing", () => {
    for (let standing = 0; standing < ERA_SEQUENCE.length; standing += 1) {
      const opened = initialCarouselState(standing);
      const first = commandCarousel(opened, { type: "first" }, "home-key");
      expect(first.requestedIndex).toBe(0);
      expect(
        commandCarousel(first, { type: "step", delta: -1 }, "left-key").requestedIndex,
      ).toBe(0);

      const last = commandCarousel(first, { type: "last" }, "end-key");
      expect(last.requestedIndex).toBe(ERA_SEQUENCE.length - 1);
      expect(
        commandCarousel(last, { type: "step", delta: 1 }, "right-key").requestedIndex,
      ).toBe(ERA_SEQUENCE.length - 1);
      expect(last.standingIndex).toBe(standing);
    }
  });

  it("defines the complete eight-path behavior population with a non-vacuous floor", () => {
    expect(ARCHIPELAGO_NAV_INPUTS).toEqual([
      "previous-arrow",
      "next-arrow",
      "left-key",
      "right-key",
      "home-key",
      "end-key",
      "swipe",
      "direct-list",
    ]);
    expect(ARCHIPELAGO_NAV_INPUTS).toHaveLength(8);
    expect(new Set(ARCHIPELAGO_NAV_INPUTS).size).toBe(8);
  });
});
