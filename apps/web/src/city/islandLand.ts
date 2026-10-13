import {
  ERA_SEQUENCE,
  type EraId,
  eraBuildableRadius,
  eraLandDemand as cumulativeLandDemand,
  landBudgetRadiusFor,
} from "@cr/skill-graph";
import {
  buildableRadiusForLand,
  type CityLayout,
  computeCityLayout,
  GRASS_OVER_BUILDABLE,
  ISLAND_GRASS_RADIUS,
  SEA_RADIUS,
} from "./worldLayout";

export { GRASS_OVER_BUILDABLE } from "./worldLayout";

/**
 * **HOW FAR THE DRAWN LAND REACHES, PER ERA — the shore D-ERA25's ten budgets ask for.**
 *
 * Authority: **D-ERA25** (the buildable radius is authored per era, all ten now in
 * `eras.ts`: 22 / 30 / 35 / 42 / 46 / 51 / 55 / 60 / 64 / 69) and **§5.1** of
 * `docs/superpowers/specs/2026-07-27-era-progression-design.md`, which rules that
 * `ISLAND_GRASS_RADIUS` and `SEA_RADIUS` do NOT follow the buildable radius on their own —
 * *"every era that grows the island therefore also re-authors its shore, or buildable cells
 * end up on sand or water."* This module is that authoring, done once as a rule with its
 * reasoning rather than as ten hand-picked numbers, and it is the same standing as D-ERA25's
 * own derivation: a proposal from the code lane rather than a ruling.
 *
 * ## THE MARGIN IS ERA ONE'S OWN, AND IT IS STRUCTURAL RATHER THAN TASTE
 *
 * Era one draws grass 30 around a buildable 22, so the green margin between the last legal
 * cell and the shoreline is **8 units**. That margin is load-bearing three times over, and
 * every one of the three is a measurement off the shipped island:
 *
 *  - **a building would otherwise stand on the beach.** `isCellBuildable` tests a cell's
 *    CENTRE, so a legal cell reaches `GRID_CELL / 2` further out on each axis — 2.83u to its
 *    far corner — and a 2-cell footprint further still;
 *  - **the ground is only FLAT to `grassR - 2.4`.** `StarterIsland`'s shore starts shelving
 *    there (`fromRc = grassR - 2.4`), so land inside that is already tipping over;
 *  - **the island's whole decoration band is this margin.** Trees, scrub and boulders scatter
 *    between `BUILDABLE_RADIUS + 3` and `grassR - 2.2` — 25 to 27.8 on the shipped island — so
 *    a margin under about 5.2 units inverts the band and the island loses its vegetation
 *    outright.
 *
 * So the drawn grass radius is the era's authored budget plus {@link GRASS_OVER_BUILDABLE},
 * never less than the island already drawn. **A no-margin rule (grass = the budget) was
 * costed first and rejected on the third of those**: it makes era one to two free, because
 * era two's budget of 30 is exactly `ISLAND_GRASS_RADIUS`, and it empties the decoration band
 * at every era after it.
 *
 * ## AND IT IS CAPPED, BECAUSE THE CAP IS MEASURED
 *
 * {@link ISLAND_GROWTH_CEILING}. Four of the ten budgets want more land than the road layer's
 * depth budget can pay for, so they are clamped and {@link eraLandIsClamped} says which — a
 * number the game cannot draw honestly is reported rather than shipped.
 */

/*
 * {@link GRASS_OVER_BUILDABLE} — the green the island keeps between its last buildable cell and
 * its shoreline — is re-exported from `worldLayout.ts` above and carries its derivation there.
 * It MOVED when the buildable disc became era-driven, because it is now read in both
 * directions: this module adds it to an era's authored budget to get the land to draw, and
 * `worldLayout.buildableRadiusForLand` subtracts it from the land to get the disc that land can
 * carry. Two readings of one constant, so the shore and the disc cannot come apart.
 */

/**
 * The largest grass radius this game may draw, in world units.
 *
 * **Measured, twice, and the second measurement is the one that stands.** §5.1 recorded a
 * growth gate of about 5% — "buildable 22 toward about 23.5" — and that figure was taken
 * against the three-surface road stack whose tightest gap was `0.02u`. D-ERA30 replaced that
 * stack with a uniform `0.05u` ladder and nobody re-derived the gate. #413 did, through
 * `depthPrecision.test.ts`'s own helpers: grass 30 gives **11.04** resolvable depth steps
 * between the closest pair of road surfaces at the furthest view, 45 gives **4.90**, and 50
 * gives **3.97** — under the guard's bar of 4. The control that says this is the same
 * measurement with one documented input changed is that every stale row reproduces when
 * scaled by `0.05 / 0.02`.
 *
 * So the island can grow to about **grass 46**, better than half again its radius, and not to
 * 31. `three/depthPrecision.test.ts` sweeps every era's shipped radius through that same
 * arithmetic, so this constant is held to the guard rather than quoted at it.
 *
 * **It is a ceiling on the LAND and therefore on the camera.** A projection view offset moves
 * no camera (`three/cityFraming.ts`), so framing the island costs none of this budget; what
 * spends it is `cameraDistance = islandRadius * CAMERA_DISTANCE_RATIO`, which is why a dolly
 * to fix the framing was rejected — it would have taken this ceiling from about 50 down to
 * about 33, below era three's authored 35.
 */
export const ISLAND_GROWTH_CEILING = 46;

/**
 * The cells one era's OWN island must carry: that era's skill and civic increments,
 * plus its own Town Hall. The source table is cumulative for the legacy one-island city,
 * so this subtraction is the archipelago boundary.
 */
export function eraIslandOccupiedCells(eraId: EraId): number {
  const index = ERA_SEQUENCE.findIndex((era) => era.id === eraId);
  if (index < 0) {
    throw new Error(`Era "${eraId}" is absent from the authored sequence.`);
  }
  const current = cumulativeLandDemand(eraId);
  const previousEra = ERA_SEQUENCE[index - 1];
  const previous = previousEra ? cumulativeLandDemand(previousEra.id) : null;
  return (
    current.cumulative_skill_cells -
    (previous?.cumulative_skill_cells ?? 0) +
    current.cumulative_civic_cells -
    (previous?.cumulative_civic_cells ?? 0) +
    current.hall_cells
  );
}

/** The buildable radius for one era's own roster, not the cumulative city. */
export function eraIslandBuildableRadius(eraId: EraId): number {
  return landBudgetRadiusFor(eraIslandOccupiedCells(eraId));
}

/** The grass radius one era's own island asks for. */
export function eraIslandLandDemand(eraId: EraId): number {
  return Math.max(
    ISLAND_GRASS_RADIUS,
    eraIslandBuildableRadius(eraId) + GRASS_OVER_BUILDABLE,
  );
}

/**
 * The fixed radius of one archipelago island. All ten sit below the measured depth ceiling;
 * the explicit failure keeps a future era from silently reintroducing the old clamp.
 */
export function eraIslandLandRadius(eraId: EraId): number {
  const demand = eraIslandLandDemand(eraId);
  if (demand > ISLAND_GROWTH_CEILING) {
    throw new Error(
      `Era "${eraId}" needs island grass radius ${demand}, above the measured ceiling ` +
        `${ISLAND_GROWTH_CEILING}. Re-author its own-era land budget before shipping it.`,
    );
  }
  return demand;
}

/** A guard-readable statement of whether an own-era island would hit the old clamp. */
export function eraIslandLandIsClamped(eraId: EraId): boolean {
  return eraIslandLandDemand(eraId) > ISLAND_GROWTH_CEILING;
}

/** Lagoon extent for a fixed own-era island, preserving era one's water ratio. */
export function eraIslandSeaRadius(eraId: EraId): number {
  return (eraIslandLandRadius(eraId) * SEA_RADIUS) / ISLAND_GRASS_RADIUS;
}

/**
 * The grass radius an era's authored budget ASKS for, before the ceiling.
 *
 * Kept separate from {@link eraLandRadius} so the shortfall at eras four to ten is a number a
 * reviewer can read rather than a difference nothing states.
 */
export function eraLandDemand(eraId: EraId): number {
  return Math.max(ISLAND_GRASS_RADIUS, eraBuildableRadius(eraId) + GRASS_OVER_BUILDABLE);
}

/** The grass radius an era's island is DRAWN at — its demand, held under the ceiling. */
export function eraLandRadius(eraId: EraId): number {
  return Math.min(ISLAND_GROWTH_CEILING, eraLandDemand(eraId));
}

/**
 * True when an era wants more land than {@link ISLAND_GROWTH_CEILING} allows, so the island
 * it is drawn on is smaller than the one its buildings were budgeted for.
 *
 * Exposed rather than hidden so authored demand and rendered capacity can be compared.
 */
export function eraLandIsClamped(eraId: EraId): boolean {
  return eraLandDemand(eraId) > ISLAND_GROWTH_CEILING;
}

/**
 * How much lagoon is drawn around an era's island, in world units.
 *
 * Era one's own ratio, held: `SEA_RADIUS / ISLAND_GRASS_RADIUS`. This is the one term on the
 * island that is a SCENE EXTENT rather than art — how much water is drawn before the world
 * runs out — and holding the ratio is the same scale-invariance argument `cityFraming.ts`
 * makes about the camera: a bigger disc with proportionally more water around it is the same
 * picture. Left at a flat 58 the lagoon reads as having an edge behind a grown island, which
 * `three/cityFraming.browser.test.tsx` already had to work around by hand for its own shots
 * (*"a lagoon left at 58 around a grass disc of 46 photographs the MISSING SHORE ART rather
 * than the framing"*).
 *
 * The SHORE — the beach's own profile and tones — is per-era art (D-ERA26) and is not this
 * module's; `StarterIsland`'s `SHORE_PROFILE` is an absolute width of sand and stays one.
 */
export function eraSeaRadius(eraId: EraId): number {
  return (eraLandRadius(eraId) * SEA_RADIUS) / ISLAND_GRASS_RADIUS;
}

/**
 * **THE LAYOUT FOR THE ISLAND AN ERA IS ACTUALLY DRAWN ON — the one entry point that cannot
 * hand back somebody else's island.**
 *
 * This is what `CitySurface` composes by hand (`computeCityLayout(eraLandRadius(eraId),
 * eraSeaRadius(eraId))`), lifted so a measurement and the product build the same object from
 * the same era rather than from two sets of numbers that happen to agree today.
 *
 * ## Why it exists, and it is a repair rather than a convenience
 *
 * `computeCityLayout` used to default its radius to {@link ISLAND_GRASS_RADIUS}, so the
 * no-argument call returned **era one's** island while reading like *"the city layout"*.
 * `eraTwoGround.test.ts` measured era two's worked field in it and
 * `three/eraTwoField.browser.test.tsx` photographed era two's field in it; era two's island is
 * grass 38 with a 10.8-unit margin ring and both were looking at 30 and 2.8. Nothing failed,
 * and what shipped was fields a third of the width era two's style guide implies and a
 * re-theme beat that moved 0.62% of the frame.
 *
 * The default is gone (see `computeCityLayout`'s own block), so a caller has to name an
 * island. **This is how it names one by ERA**, which is the form nearly every caller wants:
 * `eraCityLayout("prehistoric")` is a statement that a measurement is about era one, where
 * `computeCityLayout()` was a statement about nothing.
 *
 * It reads the CLAMPED radius, which is the one the game draws — see {@link eraLandRadius} and
 * {@link eraLandIsClamped} for the four eras where the two differ.
 */
export function eraCityLayout(eraId: EraId): CityLayout {
  return computeCityLayout(eraLandRadius(eraId), eraSeaRadius(eraId));
}

/**
 * **THE BUILDABLE DISC AN ERA'S OWN ISLAND OFFERS, in world units — the era-explicit entry
 * point every gate that means "this era" should call.**
 *
 * `eraCityLayout`'s counterpart, and the same repair one layer down. `computeCityLayout` used
 * to hand back era one's island from a call that named no island; `isCellBuildable` used to
 * hand back era one's DISC from a call that named nothing at all, because it closed over
 * `BUILDABLE_RADIUS`. Both are now arguments, and this is how a caller says which era it means:
 * `eraBuildableDiscRadius("renaissance")` is a statement, where the old `isCellBuildable(c, r)`
 * was a statement about nothing.
 *
 * Read off {@link eraLandRadius} — the CLAMPED land, which is what the game draws — so it is
 * the era's authored budget wherever the ceiling is not binding and the land's own limit
 * wherever it is. The ten values are **22 / 30 / 35 / 38 / 38 / 38 / 38 / 38 / 38 / 38**, and
 * {@link eraLandIsClamped} names the seven where that is short of what D-ERA25 authored.
 */
export function eraBuildableDiscRadius(eraId: EraId): number {
  return buildableRadiusForLand(eraLandRadius(eraId));
}
