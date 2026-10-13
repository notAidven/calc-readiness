import { ERA_SEQUENCE } from "@cr/skill-graph";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { hasAuthoredEraTownHall } from "../city/townHall";
import {
  AUTHORED_ERA_HALL_GLYPHS,
  ERA_HALL_GLYPH_ERAS,
  EraHallGlyph,
  EraHallMedallion,
} from "./EraHallGlyph";

describe("the route's era hall glyph census", () => {
  it("draws exactly the eras with bundled halls and keeps the generic branch reachable", () => {
    const authored = ERA_SEQUENCE.map((era) => era.id).filter(hasAuthoredEraTownHall);
    const drawn = Object.keys(AUTHORED_ERA_HALL_GLYPHS).sort();

    expect(new Set(drawn)).toEqual(new Set(authored));
    expect(new Set(ERA_HALL_GLYPH_ERAS)).toEqual(new Set(authored));
    expect(authored.length).toBeGreaterThanOrEqual(6);
    expect(authored.length).toBeLessThan(ERA_SEQUENCE.length);
  });

  it("renders authored and generic silhouettes without adding an accessible image name", () => {
    for (const eraId of [
      "classical",
      "atomic_age",
      "information_age",
      "cyberpunk",
    ] as const) {
      const authored = render(
        <svg aria-hidden="true">
          <EraHallGlyph eraId={eraId} />
        </svg>,
      );
      expect(
        authored.container.querySelector(`[data-era-hall-glyph="${eraId}"]`),
      ).toHaveAttribute("data-hall-art", "authored");
      authored.unmount();
    }

    const generic = render(<EraHallMedallion eraId="renaissance" />);
    expect(
      generic.container.querySelector('[data-era-hall-glyph="renaissance"]'),
    ).toHaveAttribute("data-hall-art", "generic");
    expect(generic.container.querySelectorAll('[role="img"]')).toHaveLength(0);
  });
});
