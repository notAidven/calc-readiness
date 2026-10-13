import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { ISLAND_GROWTH_CEILING } from "../city/islandLand";
import {
  BAY_SWEEP_RADIANS,
  BAY_WATER_GAP,
  bayArcRadius,
  bayBounds,
  bayChords,
  bayLayout,
  eraIslandFootprint,
  eraOwnBuildableRadius,
  eraOwnGrassRadius,
  eraOwnLandCells,
  overviewProjection,
  projectIsland,
} from "./bayLayout";

/**
 * **THE BAY, MEASURED AGAINST THE DOCUMENT THAT SPECIFIED IT.**
 *
 * Subject: `docs/superpowers/specs/2026-08-04-archipelago-design.md` §2 and §4, and its
 * `04-overview-bay.svg`. Every figure below is quoted from that document and re-derived here
 * from the shipped constants, so this file is a check that the built composition IS the
 * specified one rather than a transcription of it.
 *
 * ## ⚑ ONE FIGURE IN THE SPEC'S PROSE DISAGREES WITH THE SPEC'S OWN DIAGRAM, AND THE DIAGRAM IS RIGHT
 *
 * §4 lists the ten x positions as *"−289, −272, −223, −147, −55, 43, 137, 218, 271, 289"*.
 * Nine of the ten reproduce exactly. **Island six comes out at 42.48, which rounds to 42 and
 * not to 43.**
 *
 * The diagram settles it rather than an argument. `04-overview-bay.svg` draws all ten at
 * fixed coordinates; fitting this module's layout to those coordinates by least squares gives
 * one scale and one offset with residuals **under 0.05 world units at every island** — which
 * is the SVG's own 2-decimal rounding — and island six's residual is 0.051, the same size as
 * every other. So the diagram was generated from this arithmetic, and the prose rounded one
 * of its ten numbers the wrong way. {@link SPEC_X} carries the diagram's value.
 *
 * Nothing downstream turns on it: half a world unit is 0.8 CSS pixels at 1024x580, against an
 * island that reads 95 of them.
 */

/** §2's table, column "own cells": what ONE era's city occupies, hall included. */
const SPEC_OWN_CELLS = [47, 48, 48, 52, 46, 58, 50, 72, 60, 63] as const;

/** §2's table, column "buildable". The claim the whole recommendation rests on. */
const SPEC_BUILDABLE = [22, 24, 24, 24, 22, 24, 24, 27, 25, 25] as const;

/** §2's table, column "grass". */
const SPEC_GRASS = [30, 32, 32, 32, 30, 32, 32, 35, 33, 33] as const;

/**
 * §4's laid-out x positions, at the ONE correction the diagram forces (see the header):
 * island six is 42, not the prose's 43.
 */
const SPEC_X = [-289, -272, -223, -147, -55, 42, 137, 218, 271, 289] as const;

/** The lead's window, which is the viewport §568 measured its composition in. */
const LEAD_WINDOW = { width: 1024, height: 580 } as const;

function eraAt(position: number): EraId {
  return (ERA_SEQUENCE[position] as (typeof ERA_SEQUENCE)[number]).id;
}

describe("an island is one era's city", () => {
  it("takes §2's own-cell counts from the demand table's increments", () => {
    expect(ERA_SEQUENCE.map((era) => eraOwnLandCells(era.id))).toEqual([...SPEC_OWN_CELLS]);
  });

  it("reproduces era one's shipped island as the fixed point of the derivation", () => {
    // The control on the differencing: era one has nothing before it, so its own demand is
    // its cumulative demand, and the radius that comes out has to be the one that ships.
    expect(eraOwnLandCells("prehistoric")).toBe(47);
    expect(eraOwnBuildableRadius("prehistoric")).toBe(22);
    expect(eraOwnGrassRadius("prehistoric")).toBe(30);
  });

  it("wants §2's buildable radii of 22 to 27, and its grass of 30 to 35", () => {
    expect(ERA_SEQUENCE.map((era) => eraOwnBuildableRadius(era.id))).toEqual([
      ...SPEC_BUILDABLE,
    ]);
    expect(ERA_SEQUENCE.map((era) => eraOwnGrassRadius(era.id))).toEqual([...SPEC_GRASS]);
  });

  it("puts the largest island eleven units under the ceiling seven eras currently hit", () => {
    // §2: "the largest island in the run is eleven units under it". This is the argument that
    // carries the whole recommendation, so it is asserted rather than quoted.
    const largest = Math.max(...ERA_SEQUENCE.map((era) => eraOwnGrassRadius(era.id)));
    expect(largest).toBe(35);
    expect(ISLAND_GROWTH_CEILING - largest).toBe(11);
    for (const era of ERA_SEQUENCE) {
      expect(eraOwnGrassRadius(era.id)).toBeLessThan(ISLAND_GROWTH_CEILING);
    }
  });

  it("measures a footprint as the grass plus the beach the camera already fits", () => {
    for (const era of ERA_SEQUENCE) {
      expect(eraIslandFootprint(era.id) - eraOwnGrassRadius(era.id)).toBe(4);
    }
  });

  it("refuses an era it has no demand row for, rather than sizing an island from nothing", () => {
    expect(() => eraOwnLandCells("not_an_era" as EraId)).toThrow(/land demand row/i);
  });
});

describe("the bay's arc", () => {
  it("keeps era one's own 28 units of water between every pair of shorelines", () => {
    expect(BAY_WATER_GAP).toBe(28);
    const chords = bayChords();
    expect(chords).toHaveLength(ERA_SEQUENCE.length - 1);
    chords.forEach((chord, at) => {
      const gap = chord - eraIslandFootprint(eraAt(at)) - eraIslandFootprint(eraAt(at + 1));
      expect(gap).toBe(BAY_WATER_GAP);
    });
  });

  it("solves a radius of about 289 that consumes exactly 180 degrees", () => {
    const arcRadius = bayArcRadius();
    // §4's measured figure, and §568's caption: "the arc radius is solved so the chord
    // between neighbours keeps the same 28 units of water a straight chain gives them".
    expect(arcRadius).toBeGreaterThan(288.5);
    expect(arcRadius).toBeLessThan(289.5);

    const sweep = bayChords().reduce(
      (total, chord) => total + 2 * Math.asin(chord / (2 * arcRadius)),
      0,
    );
    expect(sweep).toBeCloseTo(BAY_SWEEP_RADIANS, 6);
    expect(BAY_SWEEP_RADIANS).toBe(Math.PI);
  });

  it("opens at -90 degrees and closes at +90, which is what makes x monotone", () => {
    const islands = bayLayout();
    expect(islands[0]?.angle).toBeCloseTo(-Math.PI / 2, 9);
    expect(islands[islands.length - 1]?.angle).toBeCloseTo(Math.PI / 2, 6);
  });
});

describe("the bay, laid out", () => {
  const islands = bayLayout();

  it("seats all ten eras in sequence order", () => {
    expect(islands.map((island) => island.eraId)).toEqual(
      ERA_SEQUENCE.map((era) => era.id),
    );
    expect(islands.map((island) => island.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("reproduces §4's x positions, at the diagram's value for island six", () => {
    expect(islands.map((island) => Math.round(island.x))).toEqual([...SPEC_X]);
  });

  it("reads strictly left to right, which is §4's first property of the sweep", () => {
    for (let at = 1; at < islands.length; at += 1) {
      expect(islands[at]?.x).toBeGreaterThan(islands[at - 1]?.x as number);
    }
  });

  it("folds nothing back: every island's nearest neighbour is a sequence neighbour", () => {
    // §4's ordering-ambiguity ratio, measured rather than argued: nearest non-sequence
    // neighbour over nearest sequence neighbour. The bay's is 1.94; the spiral's 1.05 is
    // what rules the spiral out, so a bay that drifted toward 1.0 would have lost the
    // property it was chosen for.
    let worst = Number.POSITIVE_INFINITY;
    islands.forEach((island, at) => {
      let sequence = Number.POSITIVE_INFINITY;
      let other = Number.POSITIVE_INFINITY;
      islands.forEach((peer, peerAt) => {
        if (peerAt === at) {
          return;
        }
        const distance = Math.hypot(island.x - peer.x, island.z - peer.z);
        if (Math.abs(peerAt - at) === 1) {
          sequence = Math.min(sequence, distance);
        } else {
          other = Math.min(other, distance);
        }
      });
      worst = Math.min(worst, other / sequence);
    });
    expect(worst).toBeGreaterThan(1.9);
    expect(worst).toBeLessThan(2);
  });

  it("keeps the ends of the bay 578 units apart, which is what 250 degrees loses", () => {
    // §4: "at 250° the ends are 416 units apart against the bay's 578".
    const first = islands[0] as (typeof islands)[number];
    const last = islands[islands.length - 1] as (typeof islands)[number];
    expect(Math.hypot(first.x - last.x, first.z - last.z)).toBeCloseTo(578, 0);
  });

  it("boxes to §4's 649 x 359, which is natively a 16:9 frame's aspect", () => {
    const bounds = bayBounds(islands);
    expect(Math.round(bounds.width)).toBe(649);
    expect(Math.round(bounds.height)).toBe(359);
    // 1.809 in §4, off the same numbers before rounding. The frame is 1024/580 = 1.766.
    expect(bounds.width / bounds.height).toBeCloseTo(1.81, 2);
  });
});

describe("the composition on the lead's 1024x580 window", () => {
  const islands = bayLayout();
  const projection = overviewProjection(LEAD_WINDOW.width, LEAD_WINDOW.height);

  it("is bound by its WIDTH, which is §568's own reading of the box", () => {
    // "649 x 359 units of sea; width binds the frame". A consequence of the aspect rather
    // than an assumption: the projection takes whichever axis binds.
    const bounds = bayBounds(islands);
    expect(LEAD_WINDOW.width / bounds.width).toBeLessThan(
      LEAD_WINDOW.height / bounds.height,
    );
  });

  it("reads an island at 95px with a 107px hit target", () => {
    // §4's table, and the two numbers the arrangement was chosen on: 95px against the
    // chain's 63. `grassRadius` is the land somebody sees; `footprint` is what they click.
    const eraOne = islands[0] as (typeof islands)[number];
    expect(Math.round(2 * eraOne.grassRadius * projection.scale)).toBe(95);
    expect(Math.round(2 * projectIsland(eraOne, projection).r)).toBe(107);
  });

  it("fills 98% of the frame", () => {
    const bounds = bayBounds(islands);
    const filled =
      (bounds.width * projection.scale * (bounds.height * projection.scale)) /
      (LEAD_WINDOW.width * LEAD_WINDOW.height);
    expect(Math.round(filled * 100)).toBe(98);
  });

  it("keeps every island inside the frame, beach included", () => {
    for (const island of islands) {
      const { cx, cy, r } = projectIsland(island, projection);
      expect(cx - r).toBeGreaterThanOrEqual(-0.5);
      expect(cx + r).toBeLessThanOrEqual(LEAD_WINDOW.width + 0.5);
      expect(cy - r).toBeGreaterThanOrEqual(-0.5);
      expect(cy + r).toBeLessThanOrEqual(LEAD_WINDOW.height + 0.5);
    }
  });

  it("insets per edge rather than overlapping chrome with the bay", () => {
    const inset = overviewProjection(LEAD_WINDOW.width, LEAD_WINDOW.height, bayBounds(), {
      top: 40,
      right: 40,
      bottom: 40,
      left: 40,
    });
    expect(inset.scale).toBeLessThan(projection.scale);
    for (const island of islands) {
      const { cx, cy, r } = projectIsland(island, inset);
      expect(cx - r).toBeGreaterThanOrEqual(39.5);
      expect(cx + r).toBeLessThanOrEqual(LEAD_WINDOW.width - 39.5);
      expect(cy - r).toBeGreaterThanOrEqual(39.5);
      expect(cy + r).toBeLessThanOrEqual(LEAD_WINDOW.height - 39.5);
    }
  });

  it("spends nothing on an edge nothing reserved, which a uniform inset cannot do", () => {
    // The overview reserves caption room under the BOTTOM ROW only. A uniform inset of the
    // same size would take 5.1% of the width and 9.0% of the height and invert which axis
    // binds, so the composition would pay for three edges that need nothing.
    const bottomOnly = overviewProjection(
      LEAD_WINDOW.width,
      LEAD_WINDOW.height,
      bayBounds(),
      { bottom: 34 },
    );
    const uniform = overviewProjection(LEAD_WINDOW.width, LEAD_WINDOW.height, bayBounds(), {
      top: 34,
      right: 34,
      bottom: 34,
      left: 34,
    });
    expect(bottomOnly.scale).toBeGreaterThan(uniform.scale);
    // And every island still clears the reserved strip, which is what it was reserved for.
    for (const island of islands) {
      const { cy, r } = projectIsland(island, bottomOnly);
      expect(cy + r).toBeLessThanOrEqual(LEAD_WINDOW.height - 34 + 0.5);
    }
  });
});
