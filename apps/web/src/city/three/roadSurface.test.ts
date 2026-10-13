import { ERA_SEQUENCE } from "@cr/skill-graph";
// Type-only, following `Roads.test.ts`: a VALUE import of `three` here loads a second
// runtime copy alongside the one `Roads.tsx` uses ("Multiple instances of Three.js"),
// so meshes are recognised by three's own `isMesh` flag rather than by `instanceof`.
import type * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  ERA_ROAD_SURFACING,
  hasAuthoredRoadSurfacing,
  type RoadSurfacing,
  roadSurfacing,
  UNAUTHORED_ROAD_SURFACING,
} from "../roadSurfacing";
import type { RoadCell } from "../roads";
import { buildRoadsGroup } from "./Roads";

/**
 * What the city's roads are MADE OF, read out of the built scene graph.
 *
 * THE DEFECT THIS PINS: era one is a prehistoric shoreline settlement of thatch,
 * lashed timber and packed earth, and the road layer shipped a twentieth-century
 * street through the middle of it — dark slate asphalt (`0x4c586e`), light-grey
 * concrete curbs (`0xd3dae1`) and a white painted dashed centreline (`0xeef2f5`).
 * Evan: *"I would like the roads to be like dirt pathing in the ground."*
 *
 * Painted lane markings are the sharpest tell, because paint is not a material era
 * one has at all — so this asserts on MATERIAL CLASS rather than on exact hexes: no
 * near-white unsaturated paint anywhere, and no cool blue-grey aggregate. Both are
 * read off the meshes the builder actually produced, never off the source constants,
 * so a colour that is declared but not rendered does not satisfy it.
 *
 * The sweep carries a FLOOR (`expect(colors.length)`): every "no material is ever X"
 * assertion below holds trivially over an empty road, so the count is what makes the
 * loop mean something.
 */

/** A short run plus a crossing, so every tile shape the mask can make is present. */
const CELLS: readonly RoadCell[] = [
  { col: -2, row: 0 },
  { col: -1, row: 0 },
  { col: 0, row: 0 },
  { col: 1, row: 0 },
  { col: 0, row: -1 },
  { col: 0, row: 1 },
  { col: 4, row: 4 },
];

interface Sampled {
  readonly hex: number;
  readonly h: number;
  readonly s: number;
  readonly l: number;
  readonly r: number;
  readonly b: number;
}

/** Every OPAQUE material colour in the built road group, as HSL plus raw channels. */
function roadColors(
  cells: readonly RoadCell[] = CELLS,
  surfacing?: RoadSurfacing,
): Sampled[] {
  const group = buildRoadsGroup(cells, [], true, null, surfacing);
  const out: Sampled[] = [];
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    const material = mesh.material as THREE.MeshStandardMaterial;
    // The invisible pick target and the translucent selection wash are not surfacing.
    if (material.transparent) {
      return;
    }
    const { color } = material;
    if (!color) {
      return;
    }
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    out.push({
      hex: color.getHex(),
      h: hsl.h * 360,
      s: hsl.s,
      l: hsl.l,
      r: color.r,
      b: color.b,
    });
  });
  return out;
}

describe("the road surface must be worn earth, not asphalt and paint", () => {
  it("draws no painted lane marking and no pale concrete — nothing that bright is earth", () => {
    const colors = roadColors();
    // THE FLOOR: without this the assertion below survives a road that renders nothing.
    expect(colors.length).toBeGreaterThan(20);

    // Lightness here is three's own working-space `getHSL`, not sRGB HSL, so the
    // threshold is calibrated against the island's real palette rather than guessed:
    // its LIGHTEST earth (`C.earth` `#c9a06a`) reads 0.364 and its pale tussock
    // `#c2cc68` reads 0.371, while the white centreline reads 0.884 and the concrete
    // curb 0.702. 0.6 sits in the wide empty gap between the two families.
    const bright = colors.filter((c) => c.l > 0.6);
    expect(
      bright.map((c) => `#${c.hex.toString(16).padStart(6, "0")}`),
      "painted markings and pale concrete curbs are not era-one materials",
    ).toEqual([]);
  });

  it("draws no cool blue-grey aggregate — every road surface is a warm earth tone", () => {
    const colors = roadColors();
    expect(colors.length).toBeGreaterThan(20);

    // Earth is warm: the red channel leads the blue one, by a real margin rather
    // than by a rounding. Slate asphalt (`0x4c586e`) fails this outright — its blue
    // channel is the largest of the three.
    const cool = colors.filter((c) => c.r <= c.b + 0.08);
    expect(
      cool.map((c) => `#${c.hex.toString(16).padStart(6, "0")}`),
      "a road here is earth worn through the tussock, so nothing on it may read cool",
    ).toEqual([]);

    // And warm without being grey — packed soil, not taupe.
    for (const c of colors) {
      expect(c.s, `#${c.hex.toString(16).padStart(6, "0")} saturation`).toBeGreaterThan(
        0.12,
      );
      expect(c.h, `#${c.hex.toString(16).padStart(6, "0")} hue`).toBeGreaterThan(15);
      expect(c.h, `#${c.hex.toString(16).padStart(6, "0")} hue`).toBeLessThan(50);
    }
  });

  it("reads against the tussock it lies on, lighter on the verge and darker on the tread", () => {
    // The failure mode that would make the whole change pointless: a dirt road that
    // disappears into ground which is itself earth-toned. The ground the roads actually
    // lie on is the vivid yellow-green tussock, and this is the assertion that the path
    // is legible against it from BOTH sides — which is also what makes it read as a
    // hollow rather than a band laid on top.
    const TUSSOCK_L = 0.28; // `#a8b850`, StarterIsland's `C.tussock`, in three's space
    const colors = roadColors();
    const lightest = Math.max(...colors.map((c) => c.l));
    const darkest = Math.min(...colors.map((c) => c.l));
    // Eras one and two's road artwork was deliberately swapped (2026-08-20, explicit
    // product instruction): the DEFAULT road (no era argument, so `CURRENT_ERA_ID` /
    // `prehistoric`) now renders the courses authored for era two — `#be9464` verge,
    // measured at 0.3212 lightness against the tussock's 0.2798, a real but smaller step
    // than era one's own `#c9a06a` (0.3641) gave. The margin below is recalibrated to that
    // real number rather than kept at the old era-one-tuned 0.05.
    expect(lightest, "the verge must be clearly lighter than the tussock").toBeGreaterThan(
      TUSSOCK_L + 0.035,
    );
    expect(darkest, "the tread must be clearly darker than the tussock").toBeLessThan(
      TUSSOCK_L - 0.05,
    );
  });
});

describe("D-ERA30 — the surfacing is per era, so paved roads can come back", () => {
  it("renders a paved era's aggregate and painted markings from the same builder", () => {
    // The point of the table: era one's dirt is not baked in. A modern era declaring
    // three courses — slate aggregate, a kerb, a painted line — must render as such
    // through the SAME code path, with no branch anywhere that knows about earth.
    // Authored here rather than in `ERA_ROAD_SURFACING`, because shipping an
    // unratified era's art is exactly what `eraDressing.ts` set the precedent against.
    const paved: RoadSurfacing = {
      courses: [
        {
          kind: "slab",
          id: "kerb",
          color: 0xd3dae1,
          roughness: 0.9,
          widthFactor: 0.74,
          ragged: false,
        },
        {
          kind: "slab",
          id: "asphalt",
          color: 0x4c586e,
          roughness: 0.92,
          widthFactor: 0.56,
          ragged: false,
        },
        {
          kind: "markings",
          id: "centreline",
          color: 0xeef2f5,
          lengthFactor: 0.16,
          widthFactor: 0.09,
        },
      ],
    };
    const colors = roadColors(CELLS, paved);
    const hexes = new Set(colors.map((c) => c.hex));
    expect(hexes.has(0x4c586e), "the aggregate renders").toBe(true);
    expect(hexes.has(0xd3dae1), "the kerb renders").toBe(true);
    expect(hexes.has(0xeef2f5), "the painted centreline renders").toBe(true);

    // A markings course is not a slab, so it must draw ONE dash per connected arm
    // rather than a band — pinned by count, since a colour appearing proves only that
    // something was drawn, not that the right thing was.
    const painted = colors.filter((c) => c.hex === 0xeef2f5);
    // Four straight-run tiles with 2 arms each, two end tiles with 1, one lone stub
    // with a centre pip: 4×2 + 2×1 + 1 = 11. The crossroads at (0,0) has 4.
    expect(painted.length).toBeGreaterThan(8);

    // And the same surfacing must NOT satisfy era one's material rules — otherwise the
    // two assertions at the top of this file would be passing vacuously.
    expect(colors.some((c) => c.l > 0.6)).toBe(true);
    expect(colors.some((c) => c.r <= c.b + 0.08)).toBe(true);
  });

  it("authors eras one and two, and degrades every other era to bare earth rather than crashing", () => {
    // Era two's row landed with the era-one-to-two advance, so the roads re-dress when the
    // city advances (D-ET2 names the roads as one of the four things an advance changes).
    // Asserted by set equality both ways rather than by a count, because the CLAIM here is
    // which eras are authored — a count of two is satisfied by any two.
    expect(Object.keys(ERA_ROAD_SURFACING)).toEqual(["prehistoric", "neolithic"]);
    expect(hasAuthoredRoadSurfacing("prehistoric")).toBe(true);
    expect(hasAuthoredRoadSurfacing("neolithic")).toBe(true);

    const unauthored = ERA_SEQUENCE.filter((era) => !hasAuthoredRoadSurfacing(era.id));
    // A FLOOR: eight eras owe a surfacing row, and this is the number that makes the
    // loop below mean something rather than sweeping an empty list.
    expect(unauthored).toHaveLength(8);

    for (const era of unauthored) {
      // TOTAL, never `undefined`: a laid tile the player paid for always draws.
      expect(roadSurfacing(era.id), era.id).toBe(UNAUTHORED_ROAD_SURFACING);
      // And it draws something for every laid tile, rather than degrading to an empty
      // group — one bare-earth course is a band per cell plus an arm per connection,
      // so the floor is "at least one surface per cell the player paid for".
      const colors = roadColors(CELLS, roadSurfacing(era.id));
      expect(colors.length, era.id).toBeGreaterThanOrEqual(CELLS.length);
    }
  });

  it("gives every authored era strictly more courses than the fallback, so the sweep is not comparing equals", () => {
    // Without this, "every era renders" above would hold even if an authored era had
    // quietly become the fallback — which is the regression that would silently undo the
    // change. Swept over the authored eras rather than era one alone, so era two's row is
    // held to the same bar the day it was added.
    const authored = ERA_SEQUENCE.filter((era) => hasAuthoredRoadSurfacing(era.id));
    expect(authored).toHaveLength(2);
    for (const era of authored) {
      expect(roadSurfacing(era.id).courses.length, era.id).toBeGreaterThan(
        UNAUTHORED_ROAD_SURFACING.courses.length,
      );
      expect(roadSurfacing(era.id), era.id).not.toBe(UNAUTHORED_ROAD_SURFACING);
    }
    expect(UNAUTHORED_ROAD_SURFACING.courses).toHaveLength(1);
  });

  /**
   * THE ADVANCE HAS TO BE VISIBLE ON THE ROAD, which is the whole reason era two has a row.
   * Two authored eras that rendered the same road would satisfy every assertion above — both
   * would have two courses, neither would be the fallback — so the difference is asserted
   * directly, and on the RENDERED colours rather than on the table.
   */
  it("draws era two's road differently from era one's, so the advance reaches the ground", () => {
    const one = roadColors(CELLS, roadSurfacing("prehistoric"));
    const two = roadColors(CELLS, roadSurfacing("neolithic"));

    const hexesOne = new Set(one.map((c) => c.hex));
    const hexesTwo = new Set(two.map((c) => c.hex));
    expect(hexesOne.size, "era one's road drew no colours").toBeGreaterThan(0);
    expect(hexesTwo.size, "era two's road drew no colours").toBeGreaterThan(0);
    // No colour is shared, so a learner sees a different road rather than a re-tinted one.
    for (const hex of hexesTwo) {
      expect(hexesOne.has(hex), `era two reuses era one's ${hex.toString(16)}`).toBe(false);
    }

    // Eras one and two's artwork was deliberately swapped (2026-08-20, explicit product
    // instruction): `roadSurfacing("prehistoric")` now renders the courses authored for era
    // two (the darker trodden hollow way) and `roadSurfacing("neolithic")` now renders the
    // courses authored for era one (the lighter worn tread). So the "trodden into a hollow
    // way, beaten hardest where it is used hardest" darker tread is on `prehistoric` now,
    // not on `neolithic` — the inequality flips with the swap rather than disappearing.
    const darkestOne = Math.min(...one.map((c) => c.l));
    const darkestTwo = Math.min(...two.map((c) => c.l));
    expect(darkestOne).toBeLessThan(darkestTwo);
  });
});
