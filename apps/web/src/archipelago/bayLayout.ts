import {
  ERA_LAND_DEMAND,
  ERA_SEQUENCE,
  type EraId,
  HALL_LAND_CELLS,
  landBudgetRadiusFor,
} from "@cr/skill-graph";

import { ISLAND_SHORE_REACH } from "../city/three/cityFraming";
import { GRASS_OVER_BUILDABLE, ISLAND_GRASS_RADIUS, SEA_RADIUS } from "../city/worldLayout";

/**
 * **THE BAY: WHERE THE TEN ISLANDS SIT, IN WORLD UNITS.**
 *
 * Authority: `docs/superpowers/specs/2026-08-04-archipelago-design.md` §2 and §4, and its
 * `04-overview-bay.svg`. **This module is that document's arithmetic and nothing else.**
 * Every number here is derived from a constant the game already ships, in the way §568
 * derives it, so a reviewer can check the composition against the spec rather than against
 * a taste.
 *
 * ## THIS IS STRUCTURE, NOT ART, AND THE SPLIT IS THE WHOLE POINT OF THE FILE
 *
 * Evan owns island art and design: how the overview is rendered (illustrated map, 2.5D or
 * light 3D — §568 costed all three and deliberately chose none), the haze curve, and what a
 * locked island looks like. **None of those is here.** What is here is where the islands sit
 * relative to each other and how big each one is, which §568 derived to fit a 16:9 frame at a
 * short viewport and which holds identically for all three rendering techniques (§4: *"it
 * frames identically whether the overview ends up oblique, isometric or flat"*).
 *
 * So this module hands out a plan in world units with no colour, no opacity and no pixel in
 * it. `overviewProjection` is the one place a plan becomes a picture, and it is a similarity
 * transform: whatever Evan draws, it draws into these positions.
 *
 * ## AN ISLAND IS ONE ERA'S CITY, WHICH IS WHY THE RADII ARE SMALL
 *
 * §2's strongest claim, and the reason the archipelago exists: **an island holding one era's
 * city needs a buildable radius of 22 to 27 where a cumulative one needs 69.** The shipped
 * `islandLand.ts` sizes an island from `eraBuildableRadius`, which is CUMULATIVE — era five's
 * island holds everything from eras one to five — and seven of the ten eras are clamped by
 * `ISLAND_GROWTH_CEILING` as a result.
 *
 * {@link eraOwnLandCells} takes the same demand table's per-era INCREMENTS instead, through
 * the same `landBudgetRadiusFor`. The ten come out at 22 / 24 / 24 / 24 / 22 / 24 / 24 / 27 /
 * 25 / 25 buildable, grass 30 to 35, and the largest is eleven units under the ceiling.
 *
 * **Stage 1 changes no island, and this module is why that is true rather than promised.**
 * §7's stage 1 *"needs no data migration, no change to `islandLand.ts` and no change to
 * placement"*. Nothing here is imported by `islandLand.ts`, by `worldLayout.ts` or by
 * anything the city surface renders; the dependency runs one way, into the overview. The
 * per-era radii below are what an island WOULD be sized at under stage 3, used here only to
 * size a mark on a map — see {@link eraOwnGrassRadius}.
 */

/**
 * **HOW MUCH OPEN WATER SEPARATES TWO SHORELINES, in world units — era one's own margin.**
 *
 * §4: *"28 units of open water between shorelines (`SEA_RADIUS - ISLAND_GRASS_RADIUS`, era
 * one's own margin)"*. Derived rather than written down, so the bay's spacing is the lagoon
 * the game already draws around a single island and not a number chosen for a diagram.
 */
export const BAY_WATER_GAP = SEA_RADIUS - ISLAND_GRASS_RADIUS;

/**
 * **THE SWEEP: 180 degrees, and §4 gives two proofs that it is the largest one available.**
 *
 *  - *"It is the largest sweep on which the islands still read strictly left to right.
 *    Position is `x = R·sin(a)` and `sin` is monotone exactly on `[-90°, +90°]`."*
 *  - *"It is the largest sweep on which nothing folds back. Past 180° two islands far apart
 *    in sequence start coming back together; at 250° the ends are 416 units apart against the
 *    bay's 578."*
 *
 * Both are properties of this constant rather than of the art, which is why it lives here.
 * `bayLayout.test.ts` re-derives both rather than quoting them.
 */
export const BAY_SWEEP_RADIANS = Math.PI;

/**
 * How many cells ONE era's own content occupies — its own skill buildings, its own closing
 * civic city, and a hall.
 *
 * `ERA_LAND_DEMAND`'s columns are RUNNING TOTALS (`eras.ts`: *"era five's island must hold
 * everything from eras one to five"*), so an era's own demand is the difference against the
 * era before it. The hall is NOT differenced: every island has one standing on it (§8.4,
 * *"a new island arrives with its hall standing"*), so `HALL_LAND_CELLS` is added whole to
 * each rather than only to era one's.
 *
 * Era one's own row is unchanged by the differencing, which is the control: it comes out at
 * 47, exactly `ERA_ONE_OCCUPIED_CELLS`, so the shipped island is the fixed point of this
 * derivation rather than a special case beside it.
 */
export function eraOwnLandCells(eraId: EraId): number {
  const at = ERA_LAND_DEMAND.findIndex((row) => row.era === eraId);
  if (at === -1) {
    throw new Error(
      `ERA_LAND_DEMAND has a land demand row for every era in ERA_SEQUENCE, and "${eraId}" ` +
        "reached here without one. That is the demand table coming apart from the sequence " +
        "rather than a caller passing something odd.",
    );
  }
  const row = ERA_LAND_DEMAND[at] as (typeof ERA_LAND_DEMAND)[number];
  const before =
    at === 0 ? null : (ERA_LAND_DEMAND[at - 1] as (typeof ERA_LAND_DEMAND)[number]);
  const skill = row.cumulative_skill_cells - (before?.cumulative_skill_cells ?? 0);
  const civic = row.cumulative_civic_cells - (before?.cumulative_civic_cells ?? 0);
  return skill + civic + HALL_LAND_CELLS;
}

/**
 * The buildable radius ONE era's own island wants, in world units.
 *
 * The same `landBudgetRadiusFor` the cumulative budgets are authored through — era one's
 * measured 53.4% fill, named at the top of its tread — applied to the era's own demand
 * instead of the running total. §2's table: **22 / 24 / 24 / 24 / 22 / 24 / 24 / 27 / 25 /
 * 25**.
 */
export function eraOwnBuildableRadius(eraId: EraId): number {
  return landBudgetRadiusFor(eraOwnLandCells(eraId));
}

/**
 * The grass radius one era's own island is drawn at, in world units: **30 to 35**.
 *
 * `GRASS_OVER_BUILDABLE` is era one's own margin between its last legal cell and its shore,
 * and `islandLand.ts` derives the shipped island's grass the same way. This is deliberately
 * NOT `eraLandRadius`, and the difference is the whole of §2: that function reads the
 * CUMULATIVE budget and clamps seven of the ten at `ISLAND_GROWTH_CEILING`, and this one
 * never approaches the ceiling because a single era's city is small.
 *
 * ⚑ **Nothing on the shipped island reads this.** Stage 1 draws one island exactly as it
 * ships and this radius sizes a mark on the overview map. It is the radius stage 3 would
 * re-author `islandLand.ts` to, which is why it is derived here now: the composition below
 * is sized by it, so the overview a learner sees in stage 1 is already the arrangement the
 * real islands land in.
 */
export function eraOwnGrassRadius(eraId: EraId): number {
  return eraOwnBuildableRadius(eraId) + GRASS_OVER_BUILDABLE;
}

/**
 * **HOW MUCH ROOM AN ISLAND TAKES UP, in world units — its grass plus its beach.**
 *
 * `ISLAND_SHORE_REACH` is `cityFraming.ts`'s own answer to the same question for the shipped
 * island. So an island's footprint on the map is
 * the footprint the camera already fits, and the water between two islands in the bay is
 * measured shore to shore rather than grass to grass.
 */
export function eraIslandFootprint(eraId: EraId): number {
  return eraOwnGrassRadius(eraId) + ISLAND_SHORE_REACH;
}

/** One island's place in the bay, in world units, with the arc's centre at the origin. */
export interface BayIsland {
  readonly eraId: EraId;
  /** 1-based position in `ERA_SEQUENCE`. Era one is 1. */
  readonly number: number;
  /** Where the island sits along the bay's mouth. Strictly increasing, `-R` to `+R`. */
  readonly x: number;
  /**
   * How far into the bay the island sits. Negative is away from the viewer, so the arc
   * bellies away and islands one and ten sit at `z = 0` on the near edge.
   */
  readonly z: number;
  /** Where on the arc, in radians, `-PI/2` at era one and `+PI/2` at era ten. */
  readonly angle: number;
  /** {@link eraOwnGrassRadius} — the drawn land. */
  readonly grassRadius: number;
  /** {@link eraIslandFootprint} — the land plus its beach, which is what the gap measures. */
  readonly footprint: number;
}

/** The chord between two neighbouring islands: both shores, plus the water between them. */
function chordBetween(first: EraId, second: EraId): number {
  return eraIslandFootprint(first) + eraIslandFootprint(second) + BAY_WATER_GAP;
}

/** Every chord along the bay, in sequence order. Nine of them, for ten islands. */
export function bayChords(): readonly number[] {
  return ERA_SEQUENCE.slice(0, -1).map((era, at) =>
    chordBetween(era.id, (ERA_SEQUENCE[at + 1] as (typeof ERA_SEQUENCE)[number]).id),
  );
}

/** The central angle a chord subtends on a circle of radius `arcRadius`. */
function centralAngle(chord: number, arcRadius: number): number {
  return 2 * Math.asin(Math.min(1, chord / (2 * arcRadius)));
}

/**
 * **THE ARC RADIUS, SOLVED RATHER THAN AUTHORED — about 288.9 world units.**
 *
 * §568's own caption: *"The arc radius is solved so the chord between neighbours keeps the
 * same 28 units of water a straight chain gives them."* Both constraints at once — every
 * neighbouring pair keeps {@link BAY_WATER_GAP} of open water, and the ten together consume
 * exactly {@link BAY_SWEEP_RADIANS} — leave exactly one free variable, which is this.
 *
 * Bisected rather than solved in closed form: the sum of `2·asin(c / 2R)` over nine chords
 * has no clean inverse, and the sum is strictly decreasing in `R`, so a bisection is both the
 * simplest thing that is right and the one whose correctness a reader can check by eye.
 *
 * **It is recomputed rather than pinned**, so an era whose content changes size moves the bay
 * with it instead of leaving a stale constant behind. `bayLayout.test.ts` pins the value that
 * comes out against §568's measured 289 and against the diagram's own positions.
 */
export function bayArcRadius(): number {
  const chords = bayChords();
  const widest = Math.max(...chords);
  const sweep = (arcRadius: number): number =>
    chords.reduce((total, chord) => total + centralAngle(chord, arcRadius), 0);

  // A circle smaller than half the widest chord cannot carry it at all, so that is the floor;
  // the ceiling is any radius flat enough to undershoot the sweep, which a straight chain is.
  let low = widest / 2;
  let high = widest * ERA_SEQUENCE.length;
  for (let step = 0; step < 200; step += 1) {
    const mid = (low + high) / 2;
    if (sweep(mid) > BAY_SWEEP_RADIANS) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (low + high) / 2;
}

/**
 * **THE BAY, LAID OUT.** Ten islands, in sequence order, in world units about the arc's
 * centre.
 *
 * Era one opens at `-PI/2` and era ten closes at `+PI/2`, which is what makes `x` strictly
 * increasing (§4: *"`sin` is monotone exactly on `[-90°, +90°]`"*) and what makes the ten a
 * timeline rather than a scatter. Measured against §568's own figures in `bayLayout.test.ts`:
 * `x` comes out at −289, −272, −223, −147, −55, 42, 137, 218, 271, 289.
 */
export function bayLayout(): readonly BayIsland[] {
  const arcRadius = bayArcRadius();
  const chords = bayChords();
  let angle = -BAY_SWEEP_RADIANS / 2;
  return ERA_SEQUENCE.map((era, at) => {
    if (at > 0) {
      angle += centralAngle(chords[at - 1] as number, arcRadius);
    }
    return {
      eraId: era.id,
      number: at + 1,
      x: arcRadius * Math.sin(angle),
      z: -arcRadius * Math.cos(angle),
      angle,
      grassRadius: eraOwnGrassRadius(era.id),
      footprint: eraIslandFootprint(era.id),
    };
  });
}

/** A rectangle in world units. `width / height` is the aspect the frame has to carry. */
export interface BayBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly width: number;
  readonly height: number;
}

/**
 * **THE TEN-ISLAND BOUNDING BOX: 649 x 359 world units, an aspect of 1.808.**
 *
 * §4's third property of the bay, and the one that decides the arrangement: *"Its ten-island
 * bounding box is natively the frame's aspect — 649 × 359, a ratio of 1.809 against 1.766. It
 * is the only arrangement that fills a 16:9 frame without a trick."*
 *
 * Taken over FOOTPRINTS rather than centres, because a box that clipped every island's beach
 * would be a box the composition does not fit in.
 */
export function bayBounds(islands: readonly BayIsland[] = bayLayout()): BayBounds {
  const minX = Math.min(...islands.map((island) => island.x - island.footprint));
  const maxX = Math.max(...islands.map((island) => island.x + island.footprint));
  const minZ = Math.min(...islands.map((island) => island.z - island.footprint));
  const maxZ = Math.max(...islands.map((island) => island.z + island.footprint));
  return { minX, maxX, minZ, maxZ, width: maxX - minX, height: maxZ - minZ };
}

/** How a world-unit plan maps onto a frame of pixels. A similarity: one scale, two offsets. */
export interface OverviewProjection {
  /** CSS pixels per world unit. */
  readonly scale: number;
  /** Where world `(0, 0)` lands in the frame, in pixels. */
  readonly originX: number;
  readonly originY: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
}

/** Room kept clear of the bay on each edge of the frame, in frame units. */
export interface FrameInsets {
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly left?: number;
}

/**
 * **WHERE THE PLAN LANDS ON A FRAME — the one place world units become pixels.**
 *
 * A uniform scale, centred in whatever the insets leave, fitted to whichever axis binds.
 * §568's own measurement is that the WIDTH binds at 16:9 (*"649 x 359 units of sea; width
 * binds the frame"*), and that is a consequence of the aspect rather than an assumption made
 * here: the `Math.min` picks whichever axis actually binds, so a portrait frame or an inset
 * one fits correctly without a second code path.
 *
 * ## THE INSETS ARE PER EDGE, AND THAT IS NOT TIDINESS
 *
 * A UNIFORM inset inverts which axis binds, because the box is wider than it is tall: 26
 * units is 5.1% of a 1024-wide frame and 9.0% of a 580-tall one, so reserving evenly makes
 * the height bind and costs the composition more than the chrome uses. A caller reserving
 * room under the bottom row therefore reserves it at the BOTTOM, and the fit spends nothing
 * on the three edges nothing needs. `ArchipelagoOverview.tsx` carries the measurement.
 */
export function overviewProjection(
  frameWidth: number,
  frameHeight: number,
  bounds: BayBounds = bayBounds(),
  insets: FrameInsets = {},
): OverviewProjection {
  const top = insets.top ?? 0;
  const right = insets.right ?? 0;
  const bottom = insets.bottom ?? 0;
  const left = insets.left ?? 0;
  const usableWidth = Math.max(1, frameWidth - left - right);
  const usableHeight = Math.max(1, frameHeight - top - bottom);
  const scale = Math.min(usableWidth / bounds.width, usableHeight / bounds.height);
  const centreX = (bounds.minX + bounds.maxX) / 2;
  const centreZ = (bounds.minZ + bounds.maxZ) / 2;
  return {
    scale,
    originX: left + usableWidth / 2 - centreX * scale,
    originY: top + usableHeight / 2 - centreZ * scale,
    frameWidth,
    frameHeight,
  };
}

/** One island's centre in frame pixels, and how wide it reads there. */
export function projectIsland(
  island: BayIsland,
  projection: OverviewProjection,
): { readonly cx: number; readonly cy: number; readonly r: number } {
  return {
    cx: projection.originX + island.x * projection.scale,
    cy: projection.originY + island.z * projection.scale,
    r: island.footprint * projection.scale,
  };
}
